const API_URL = "https://script.google.com/macros/s/AKfycbwVFr55tn4rXFuie22Y0srxAjrw_elW-Qfo_EdnXhpUtcxEePm-fStW8itfCwgXq6Aw_g/exec"; // ← ATUALIZE COM SUA URL REAL

let usuarioLogado = "";
let listaGlobal = [];

// Configuração das equipes
const EQUIPES = {
  comunicacao: {
    saudacao: "Bem-vinda, Equipe de Comunicação 🎨",
    membros: ["Cauã", "Celyne", "Caio", "Ivone"]
  },
  juridico: {
    saudacao: "Bem-vinda, Dra. Ismênia 👩‍⚖️",
    membros: ["Dr. Ismênia"]
  }
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
    const result = await res.text();

    if (result === "OK") {
      usuarioLogado = equipe;
      document.getElementById("loginPage").classList.add("d-none");
      document.getElementById("mainPage").classList.remove("d-none");

      configurarTela();
      carregarSolicitacoes();
    } else {
      document.getElementById("loginError").innerText = result || "Equipe ou senha inválida";
      document.getElementById("loginError").classList.remove("d-none");
    }
  } catch (err) {
    document.getElementById("loginError").innerText = "Erro ao conectar. Tente novamente.";
    document.getElementById("loginError").classList.remove("d-none");
  }
});

/* ================= CONFIGURA TELA ================= */
function configurarTela() {
  const equipe = EQUIPES[usuarioLogado];
  document.getElementById("saudacao").innerText = equipe.saudacao;

  if (usuarioLogado === "juridico") {
    document.getElementById("btnNova").classList.add("d-none");
    document.getElementById("menuPendentes").classList.remove("d-none");
    document.getElementById("menuHistorico").classList.remove("d-none");
  } else {
    // Popula o dropdown com os membros da equipe
    const select = document.getElementById("nomeEquipe");
    select.innerHTML = '<option value="" disabled selected>Selecione quem está criando</option>';
    equipe.membros.forEach(nome => {
      const option = document.createElement("option");
      option.value = nome;
      option.textContent = nome;
      select.appendChild(option);
    });
    select.classList.remove("d-none");
  }
}

/* ================= CARREGAR SOLICITAÇÕES ================= */
async function carregarSolicitacoes() {
  const tableArea = document.getElementById("tableArea");
  tableArea.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Carregando solicitações...</p></div>';

  try {
    const formData = new FormData();
    formData.append("action", "list");

    const res = await fetch(API_URL, { method: "POST", body: formData });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const dados = await res.json();
    listaGlobal = dados;

    if (usuarioLogado === "juridico") {
      filtrarPendentes();
    } else {
      renderComunicacao(dados);
    }
  } catch (err) {
    tableArea.innerHTML = `<div class="alert alert-danger">Erro ao carregar: ${err.message}. Verifique o console (F12).</div>`;
    console.error(err);
  }
}

/* ================= FILTROS E RENDER (exemplos básicos - adicione o resto conforme sua versão anterior) ================= */
function filtrarPendentes() {
  const pendentes = listaGlobal.filter(r => r.Status === "Pendente");
  renderJuridico(pendentes, false);
}

function filtrarHistorico() {
  const historico = listaGlobal.filter(r => r.Status !== "Pendente");
  renderJuridico(historico, true);
}

// ... adicione as funções renderJuridico, renderComunicacao, abrirGaleria, formatarData, logout, etc.
// Elas permanecem iguais às versões anteriores que você já tem.
