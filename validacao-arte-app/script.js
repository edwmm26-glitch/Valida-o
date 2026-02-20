const API_URL = "https://script.google.com/macros/s/AKfycbyVScX9AfEPdzIlO4SGf0srqDt9EK48plPh1Nol6fpxMkLs1dToSJ973LpwT_KzJaOwIA/exec";

const EQUIPE = {
  juridico: ["Dr. Ismênia"],
  comunicacao: ["Cauã", "Caio", "Celyne", "Ivone"]
};

let usuarioLogado = "";
let listaGlobal = [];
let botaoBloqueado = false;

window.onload = function() {
  verificarAcesso();
};

async function verificarAcesso() {
  document.getElementById("loading").classList.remove("d-none");
  document.getElementById("loginError").classList.add("d-none");
  document.getElementById("btnRetry").classList.add("d-none");

  try {
    const formData = new FormData();
    formData.append("action", "checkLogin");

    const res = await fetch(API_URL, { method: "POST", body: formData });
    const result = await res.text();

    if (result.startsWith("OK:")) {
      usuarioLogado = result.split(":")[1];  // "comunicacao" ou "juridico"

      document.getElementById("loginPage").classList.add("d-none");
      document.getElementById("mainPage").classList.remove("d-none");

      configurarTela();
      carregarSolicitacoes();
    } else {
      document.getElementById("loginError").innerText = result || "Acesso negado. Use um email autorizado.";
      document.getElementById("loginError").classList.remove("d-none");
      document.getElementById("btnRetry").classList.remove("d-none");
    }
  } catch (err) {
    document.getElementById("loginError").innerText = "Erro ao verificar acesso. Tente novamente.";
    document.getElementById("loginError").classList.remove("d-none");
    document.getElementById("btnRetry").classList.remove("d-none");
  } finally {
    document.getElementById("loading").classList.add("d-none");
  }
}

/* ================= CONFIGURA TELA ================= */

function configurarTela() {

  if (usuarioLogado === "juridico") {
    saudacao.innerText = "Bem-vinda, Dra. Ismênia 👩‍⚖️";

    btnNova.classList.add("d-none");
    menuPendentes.classList.remove("d-none");
    menuHistorico.classList.remove("d-none");

  } else {

    saudacao.innerText = "Bem-vinda, Equipe de Comunicação 🎨";

    nomeEquipe.classList.remove("d-none");
    nomeEquipe.innerHTML = EQUIPE.comunicacao
      .map(n => `<option>${n}</option>`)
      .join("");

    menuPendentes.classList.add("d-none");
    menuHistorico.classList.add("d-none");
  }
}

/* ================= CRIAR SOLICITAÇÃO ================= */

createForm.addEventListener("submit", async e => {
  e.preventDefault();

  if (botaoBloqueado) return;
  botaoBloqueado = true;

  const botao = createForm.querySelector("button");
  botao.disabled = true;

  const files = [...imagens.files, video.files[0]].filter(Boolean);
  if (files.length === 0) {
    showToast("Envie pelo menos uma mídia", "#dc3545");
    botao.disabled = false;
    botaoBloqueado = false;
    return;
  }

  let links = [];

  for (const file of files) {
    const base64 = await fileToBase64(file);
    const formDataUpload = new FormData();
    formDataUpload.append("action", "upload");
    formDataUpload.append("fileName", file.name);
    formDataUpload.append("mimeType", file.type);
    formDataUpload.append("base64", base64.split(",")[1]);

    const res = await fetch(API_URL, { method: "POST", body: formDataUpload });
    const url = await res.text();

    if (url.startsWith("https://")) {
      links.push(url);
    } else {
      showToast("Falha ao subir mídia: " + url, "#dc3545");
      botao.disabled = false;
      botaoBloqueado = false;
      return;
    }
  }

  let nome = usuarioLogado === "juridico"
    ? "Dr. Ismênia"
    : nomeEquipe.value;

  const formData = new FormData();
  formData.append("action", "create");
  formData.append("descricao", descricao.value);
  formData.append("prioridade", prioridade.value);
  formData.append("email", usuarioLogado);
  formData.append("nome", nome);
  formData.append("midias", links.join("|"));

  await fetch(API_URL, { method: "POST", body: formData });

  showToast("Solicitação criada com sucesso", "#198754");

  createForm.reset();
  botao.disabled = false;
  botaoBloqueado = false;

  bootstrap.Modal.getInstance(createModal).hide();
  carregarSolicitacoes();
});

/* ================= CARREGAR ================= */

async function carregarSolicitacoes() {

  const formData = new FormData();
  formData.append("action", "list");

  const res = await fetch(API_URL, { method: "POST", body: formData });
  const dados = await res.json();

  listaGlobal = dados;

  if (usuarioLogado === "juridico") {
    filtrarPendentes();
  } else {
    renderComunicacao(dados);
  }
}

/* ================= FILTROS JURÍDICO ================= */

function filtrarPendentes() {

  const pendentes = listaGlobal.filter(r => r.Status === "Pendente");

  ordenarPorPrioridade(pendentes);

  renderJuridico(pendentes, false);
}

function filtrarHistorico() {

  const historico = listaGlobal.filter(r => r.Status !== "Pendente");

  historico.sort((a,b) =>
    new Date(b["Data Avaliação"]) - new Date(a["Data Avaliação"])
  );

  renderJuridico(historico, true);
}

/* ================= ORDENAÇÃO ================= */

function ordenarPorPrioridade(lista) {

  const prioridadeOrdem = {
    "Crítica": 1,
    "Alta": 2,
    "Média": 3,
    "Baixa": 4
  };

  lista.sort((a, b) => {

    if (prioridadeOrdem[a.Prioridade] !== prioridadeOrdem[b.Prioridade]) {
      return prioridadeOrdem[a.Prioridade] - prioridadeOrdem[b.Prioridade];
    }

    return new Date(a["Data Criação"]) - new Date(b["Data Criação"]);
  });
}

/* ================= RENDER JURÍDICO ================= */

function renderJuridico(lista, historico) {

  tableArea.innerHTML = `
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>Data</th>
          <th>Nome</th>
          <th>Descrição</th>
          <th>Prioridade</th>
          <th>Status</th>
          <th>Mídias</th>
          ${!historico ? "<th>Avaliar</th>" : ""}
          <th>Justificativa</th>
        </tr>
      </thead>
      <tbody>
        ${lista.map(r => `
          <tr>
            <td>${formatarData(r["Data Criação"])}</td>
            <td>${r.Nome}</td>
            <td>${r.Descrição}</td>
            <td class="prioridade-${r.Prioridade}">${r.Prioridade}</td>
            <td>${r.Status}</td>
            <td><button class="btn btn-sm btn-info" onclick="abrirGaleria('${r.ID}')">Galeria</button></td>
            ${!historico ? `
            <td>
              <button class="btn btn-success btn-sm"
                onclick="avaliar('${r.ID}','Aprovado')">Aprovar</button>
              <button class="btn btn-danger btn-sm"
                onclick="avaliar('${r.ID}','Reprovado')">Reprovar</button>
            </td>` : ""}
            <td>${r.Justificativa || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ================= RENDER COMUNICAÇÃO ================= */

function renderComunicacao(lista) {

  ordenarPorPrioridade(lista);

  tableArea.innerHTML = `
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>Data</th>
          <th>Nome</th>
          <th>Descrição</th>
          <th>Prioridade</th>
          <th>Status</th>
          <th>Data Avaliação</th>
          <th>Mídias</th>
        </tr>
      </thead>
      <tbody>
        ${lista.map(r => `
          <tr>
            <td>${formatarData(r["Data Criação"])}</td>
            <td>${r.Nome}</td>
            <td>${r.Descrição}</td>
            <td class="prioridade-${r.Prioridade}">${r.Prioridade}</td>
            <td>${r.Status}</td>
            <td>${r["Data Avaliação"] ? formatarData(r["Data Avaliação"]) : ""}</td>
            <td><button class="btn btn-sm btn-info" onclick="abrirGaleria('${r.ID}')">Galeria</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ================= ABRIR GALERIA ================= */

function abrirGaleria(id) {
  const registro = listaGlobal.find(r => r.ID === id);
  if (!registro || !registro.Midias) {
    showToast("Nenhuma mídia encontrada", "#dc3545");
    return;
  }

  const links = registro.Midias.split("|").filter(Boolean);
  gallery.innerHTML = "";

  links.forEach(url => {
    if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
      const img = document.createElement("img");
      img.src = url;
      img.className = "gallery-img m-2";
      img.style.width = "250px";
      img.style.cursor = "zoom-in";
      img.onclick = () => window.open(url, "_blank");
      gallery.appendChild(img);
    } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
      videoPlayer.src = url;
      videoPlayer.classList.remove("d-none");
    }
  });

  new bootstrap.Modal(mediaModal).show();
}

/* ================= AVALIAR ================= */

async function avaliar(id, status) {

  let justificativa = "";

  if (status === "Reprovado") {
    justificativa = prompt("Informe a justificativa:");
    if (!justificativa) return;
  }

  const formData = new FormData();
  formData.append("action", "updateStatus");
  formData.append("id", id);
  formData.append("status", status);
  formData.append("justificativa", justificativa);

  await fetch(API_URL, { method: "POST", body: formData });

  showToast(`Solicitação ${status}`, status === "Aprovado" ? "#198754" : "#dc3545");

  carregarSolicitacoes();
}

/* ================= UTIL ================= */

function formatarData(data) {
  if (!data) return "";
  return new Date(data).toLocaleString("pt-BR");
}

function showToast(msg, color) {
  const toast = document.createElement("div");
  toast.className = "toast-center";
  toast.style.background = color;
  toast.innerText = msg;
  document.body.appendChild(toast);

  toast.style.display = "block";

  setTimeout(() => {
    toast.remove();
  }, 2500);
}

function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function logout() {
  location.reload();
}