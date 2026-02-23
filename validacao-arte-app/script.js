const API_URL = "https://script.google.com/macros/s/AKfycbwVFr55tn4rXFuie22Y0srxAjrw_elW-Qfo_EdnXhpUtcxEePm-fStW8itfCwgXq6Aw_g/exec"; // ← COLOQUE A URL EXATA DO SEU DEPLOYMENT AQUI

let usuarioLogado = "";
let listaGlobal = [];

// Equipes e saudações
const EQUIPES = {
  comunicacao: { saudacao: "Bem-vinda, Equipe de Comunicação 🎨" },
  juridico: { saudacao: "Bem-vinda, Dra. Ismênia 👩‍⚖️" }
};

/* ================= LOGIN ================= */
document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const equipe = document.getElementById("equipeInput").value;
  const senha = document.getElementById("senhaInput").value;

  const formData = new FormData();
  formData.append("action", "login");
  formData.append("equipe", equipe);
  formData.append("senha", senha);

  try {
    const res = await fetch(API_URL, { method: "POST", body: formData });
    const text = await res.text();
    console.log("Resposta login:", text);

    if (text === "OK") {
      usuarioLogado = equipe;
      document.getElementById("loginPage").classList.add("d-none");
      document.getElementById("mainPage").classList.remove("d-none");

      configurarTela();
      carregarSolicitacoes();
    } else {
      document.getElementById("loginError").innerText = text || "Equipe ou senha inválida";
      document.getElementById("loginError").classList.remove("d-none");
    }
  } catch (err) {
    console.error("Erro login:", err);
    document.getElementById("loginError").innerText = "Erro de conexão com o servidor";
    document.getElementById("loginError").classList.remove("d-none");
  }
});

/* ================= CONFIGURA TELA ================= */
function configurarTela() {
  const info = EQUIPES[usuarioLogado];
  document.getElementById("saudacao").innerText = info.saudacao;

  if (usuarioLogado === "juridico") {
    document.getElementById("btnNova").classList.add("d-none");
    document.getElementById("menuPendentes").classList.remove("d-none");
    document.getElementById("menuHistorico").classList.remove("d-none");
  } else {
    document.getElementById("nomeEquipe").classList.remove("d-none");
    // dropdown membros se precisar (adicionar depois)
  }
}

/* ================= CARREGAR SOLICITAÇÕES ================= */
async function carregarSolicitacoes() {
  const tableArea = document.getElementById("tableArea");
  tableArea.innerHTML = "Carregando...";

  try {
    const formData = new FormData();
    formData.append("action", "list");

    const res = await fetch(API_URL, {
      method: "POST",
      body: formData,
      mode: "cors",
      cache: "no-cache"
    });

    console.log("Status da resposta list:", res.status, res.statusText);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const text = await res.text();
    console.log("Resposta raw da lista:", text.substring(0, 500)); // log parcial

    let dados;
    try {
      dados = JSON.parse(text);
    } catch (parseErr) {
      throw new Error("Resposta não é JSON válido: " + text.substring(0, 200));
    }

    if (!Array.isArray(dados)) {
      throw new Error("Dados retornados não são array");
    }

    listaGlobal = dados;

    if (usuarioLogado === "juridico") {
      filtrarPendentes();
    } else {
      renderComunicacao(dados);
    }

  } catch (err) {
    console.error("Erro ao carregar solicitações:", err);
    tableArea.innerHTML = `
      <div class="alert alert-danger">
        <strong>Erro ao carregar as solicitações:</strong><br>
        ${err.message}<br>
        <small>Verifique o console (F12) para mais detalhes.</small>
      </div>
    `;
  }
}

/* ================= FILTROS ================= */
function filtrarPendentes() {
  const pendentes = listaGlobal.filter(r => r.Status === "Pendente" || r.Status === "");
  pendentes.sort((a, b) => new Date(b["Data Criação"]) - new Date(a["Data Criação"]));
  renderJuridico(pendentes, false);
}

function filtrarHistorico() {
  const historico = listaGlobal.filter(r => r.Status !== "Pendente" && r.Status !== "");
  historico.sort((a, b) => new Date(b["Data Avaliação"]) - new Date(a["Data Avaliação"]));
  renderJuridico(historico, true);
}

/* ================= RENDER ================= */
function renderJuridico(lista, isHistorico) {
  document.getElementById("tableArea").innerHTML = `
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
            <td>${r.Nome || ""}</td>
            <td>${r.Descrição || ""}</td>
            <td class="prioridade-${r.Prioridade || 'Baixa'}">${r.Prioridade || ""}</td>
            <td>${r.Status || "Pendente"}</td>
            <td>
              <button class="btn btn-sm btn-info" onclick="abrirGaleria('${r.ID}')">Ver</button>
            </td>
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
  document.getElementById("tableArea").innerHTML = `
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
            <td>${r.Nome || ""}</td>
            <td>${r.Descrição || ""}</td>
            <td class="prioridade-${r.Prioridade || 'Baixa'}">${r.Prioridade || ""}</td>
            <td>${r.Status || "Pendente"}</td>
            <td>${r["Data Avaliação"] ? formatarData(r["Data Avaliação"]) : "-"}</td>
            <td><button class="btn btn-sm btn-info" onclick="abrirGaleria('${r.ID}')">Ver</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* ================= GALERIA ================= */
function abrirGaleria(id) {
  const reg = listaGlobal.find(r => r.ID === id);
  if (!reg || !reg.Midias) {
    alert("Nenhuma mídia encontrada");
    return;
  }

  document.getElementById("gallery").innerHTML = "";
  document.getElementById("videoPlayer").classList.add("d-none");

  reg.Midias.split("|").filter(Boolean).forEach(url => {
    if (/\.(jpe?g|png|gif|webp)$/i.test(url)) {
      const img = document.createElement("img");
      img.src = url;
      img.className = "img-fluid rounded shadow-sm";
      img.style.maxWidth = "300px";
      img.style.cursor = "zoom-in";
      img.onclick = () => window.open(url, "_blank");
      document.getElementById("gallery").appendChild(img);
    } else if (/\.(mp4|webm|ogg)$/i.test(url)) {
      document.getElementById("videoPlayer").src = url;
      document.getElementById("videoPlayer").classList.remove("d-none");
    }
  });

  new bootstrap.Modal(document.getElementById("mediaModal")).show();
}

/* ================= UTIL ================= */
function formatarData(data) {
  if (!data) return "-";
  try {
    return new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return data;
  }
}

function logout() {
  location.reload();
}
