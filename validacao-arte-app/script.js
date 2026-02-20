const API_URL = "https://script.google.com/macros/s/AKfycbyVScX9AfEPdzIlO4SGf0srqDt9EK48plPh1Nol6fpxMkLs1dToSJ973LpwT_KzJaOwIA/exec";

let usuarioLogado = ""; // "comunicacao" ou "juridico"
let listaGlobal = [];
let botaoBloqueado = false;

const EQUIPES = {
  juridico: {
    saudacao: "Bem-vinda, Dra. Ismênia 👩‍⚖️",
    nomeCriador: "Dr. Ismênia",
    membrosDropdown: ["Dr. Ismênia"]
  },
  comunicacao: {
    saudacao: "Bem-vinda, Equipe de Comunicação 🎨",
    membrosDropdown: ["Cauã", "Celyne", "Caio"]
  }
};

/* LOGIN */
loginForm.addEventListener("submit", async e => {
  e.preventDefault();

  const equipe = equipeInput.value;
  const senha = senhaInput.value;

  const formData = new FormData();
  formData.append("action", "login");
  formData.append("equipe", equipe);
  formData.append("senha", senha);

  try {
    const res = await fetch(API_URL, { method: "POST", body: formData });
    const result = await res.text();

    if (result === "OK") {
      usuarioLogado = equipe;
      loginPage.classList.add("d-none");
      mainPage.classList.remove("d-none");
      configurarTela();
      carregarSolicitacoes();
    } else {
      loginError.innerText = result || "Equipe ou senha inválida";
      loginError.classList.remove("d-none");
    }
  } catch (err) {
    loginError.innerText = "Erro ao conectar. Verifique sua internet.";
    loginError.classList.remove("d-none");
  }
});

/* CONFIGURA INTERFACE */
function configurarTela() {
  const info = EQUIPES[usuarioLogado];
  saudacao.innerText = info.saudacao;

  if (usuarioLogado === "juridico") {
    btnNova.classList.add("d-none");
    menuPendentes.classList.remove("d-none");
    menuHistorico.classList.remove("d-none");
  } else {
    nomeEquipe.classList.remove("d-none");
    nomeEquipe.innerHTML = info.membrosDropdown.map(n => `<option>${n}</option>`).join("");
    menuPendentes.classList.add("d-none");
    menuHistorico.classList.add("d-none");
  }
}

/* CRIAR SOLICITAÇÃO */
createForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (botaoBloqueado) return;
  botaoBloqueado = true;

  const botao = createForm.querySelector("button");
  botao.disabled = true;

  const files = [...imagens.files, ...(video.files || [])].filter(f => f);
  if (files.length === 0) {
    showToast("Envie pelo menos uma imagem ou vídeo", "#dc3545");
    botao.disabled = false; botaoBloqueado = false; return;
  }

  let links = [];

  for (const file of files) {
    const base64 = await fileToBase64(file);
    const fd = new FormData();
    fd.append("action", "upload");
    fd.append("fileName", file.name);
    fd.append("mimeType", file.type);
    fd.append("base64", base64.split(",")[1]);

    const res = await fetch(API_URL, { method: "POST", body: fd });
    const url = await res.text();

    if (url.startsWith("https://")) {
      links.push(url);
    } else {
      showToast("Falha ao enviar arquivo: " + url, "#dc3545");
      botao.disabled = false; botaoBloqueado = false; return;
    }
  }

  const nome = usuarioLogado === "juridico" ? EQUIPES.juridico.nomeCriador : nomeEquipe.value;

  const fdCreate = new FormData();
  fdCreate.append("action", "create");
  fdCreate.append("descricao", descricao.value);
  fdCreate.append("prioridade", prioridade.value);
  fdCreate.append("nome", nome);
  fdCreate.append("midias", links.join("|"));

  await fetch(API_URL, { method: "POST", body: fdCreate });

  showToast("Solicitação criada com sucesso!", "#198754");
  createForm.reset();
  botao.disabled = false;
  botaoBloqueado = false;
  bootstrap.Modal.getInstance(createModal).hide();
  carregarSolicitacoes();
});

/* CARREGAR LISTA */
async function carregarSolicitacoes() {
  const fd = new FormData();
  fd.append("action", "list");

  const res = await fetch(API_URL, { method: "POST", body: fd });
  const dados = await res.json();
  listaGlobal = dados;

  if (usuarioLogado === "juridico") {
    filtrarPendentes();
  } else {
    renderComunicacao(dados);
  }
}

/* FILTROS JURÍDICO */
function filtrarPendentes() {
  let pendentes = listaGlobal.filter(r => r.Status === "Pendente");
  ordenarPorPrioridade(pendentes);
  renderJuridico(pendentes, false);
}

function filtrarHistorico() {
  let historico = listaGlobal.filter(r => r.Status !== "Pendente");
  historico.sort((a,b) => new Date(b["Data Avaliação"]) - new Date(a["Data Avaliação"]));
  renderJuridico(historico, true);
}

/* ORDENAÇÃO */
function ordenarPorPrioridade(lista) {
  const ordem = { "Crítica":1, "Alta":2, "Média":3, "Baixa":4 };
  lista.sort((a,b) => {
    let pa = ordem[a.Prioridade] || 5;
    let pb = ordem[b.Prioridade] || 5;
    if (pa !== pb) return pa - pb;
    return new Date(a["Data Criação"]) - new Date(b["Data Criação"]);
  });
}

/* RENDER TABELAS */
function renderJuridico(lista, isHistorico) {
  tableArea.innerHTML = `
    <table class="table table-bordered table-hover">
      <thead class="table-dark">
        <tr>
          <th>Data</th>
          <th>Nome</th>
          <th>Descrição</th>
          <th>Prioridade</th>
          <th>Status</th>
          <th>Mídias</th>
          ${!isHistorico ? "<th>Avaliar</th>" : ""}
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
            <td><button class="btn btn-sm btn-info" onclick="abrirGaleria('${r.ID}')">Ver</button></td>
            ${!isHistorico ? `
            <td>
              <button class="btn btn-success btn-sm me-1" onclick="avaliar('${r.ID}','Aprovado')">Aprovar</button>
              <button class="btn btn-danger btn-sm" onclick="avaliar('${r.ID}','Reprovado')">Reprovar</button>
            </td>` : ""}
            <td>${r.Justificativa || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderComunicacao(lista) {
  ordenarPorPrioridade(lista);
  tableArea.innerHTML = `
    <table class="table table-bordered table-hover">
      <thead class="table-dark">
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
            <td>${r["Data Avaliação"] ? formatarData(r["Data Avaliação"]) : "-"}</td>
            <td><button class="btn btn-sm btn-info" onclick="abrirGaleria('${r.ID}')">Ver</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* GALERIA */
function abrirGaleria(id) {
  const reg = listaGlobal.find(r => r.ID === id);
  if (!reg || !reg.Midias) {
    showToast("Sem mídias", "#6c757d"); return;
  }

  gallery.innerHTML = "";
  videoPlayer.classList.add("d-none");

  reg.Midias.split("|").filter(Boolean).forEach(url => {
    if (/\.(jpe?g|png|gif|webp)$/i.test(url)) {
      const img = document.createElement("img");
      img.src = url;
      img.className = "img-fluid rounded shadow-sm gallery-img";
      img.style.maxWidth = "300px";
      img.style.cursor = "zoom-in";
      img.onclick = () => window.open(url, "_blank");
      gallery.appendChild(img);
    } else if (/\.(mp4|webm|ogg)$/i.test(url)) {
      videoPlayer.src = url;
      videoPlayer.classList.remove("d-none");
    }
  });

  new bootstrap.Modal(mediaModal).show();
}

/* AVALIAR */
async function avaliar(id, status) {
  let justificativa = "";
  if (status === "Reprovado") {
    justificativa = prompt("Justificativa da reprovação:");
    if (!justificativa) return;
  }

  const fd = new FormData();
  fd.append("action", "updateStatus");
  fd.append("id", id);
  fd.append("status", status);
  fd.append("justificativa", justificativa);

  await fetch(API_URL, { method: "POST", body: fd });
  showToast(`Solicitação ${status.toLowerCase()}!`, status === "Aprovado" ? "#198754" : "#dc3545");
  carregarSolicitacoes();
}

/* UTILITÁRIOS */
function formatarData(data) {
  return data ? new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
}

function showToast(msg, bgColor) {
  const t = document.createElement("div");
  t.className = "toast-center";
  t.style.background = bgColor;
  t.innerText = msg;
  document.body.appendChild(t);
  t.style.display = "block";
  setTimeout(() => t.remove(), 3000);
}

function fileToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function logout() {
  location.reload();
}
