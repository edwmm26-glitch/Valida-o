const API_URL = "https://script.google.com/macros/s/AKfycbxqUxSqgjwLVdfhbbfXHDfvF6vuqvFd3fHw6isGm1QxAxBeMrKvjKeBOleS6xyD22sFQg/exec";

let usuarioLogado = "";
let listaGlobal = [];
let botaoBloqueado = false;

const EQUIPES = {
  juridico: { saudacao: "Bem-vinda, Dra. Ismênia 👩‍⚖️", nomeCriador: "Dr. Ismênia" },
  comunicacao: { saudacao: "Bem-vinda, Equipe de Comunicação 🎨", membros: ["Cauã", "Celyne", "Caio"] }
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

  const res = await fetch(API_URL, { method: "POST", body: formData });
  const result = await res.text();

  if (result === "OK") {
    usuarioLogado = equipe;
    loginPage.classList.add("d-none");
    mainPage.classList.remove("d-none");
    configurarTela();
    carregarSolicitacoes();
  } else {
    loginError.innerText = "Equipe ou senha inválida.";
    loginError.classList.remove("d-none");
  }
});

/* CONFIGURA TELA */
function configurarTela() {
  const info = EQUIPES[usuarioLogado];
  saudacao.innerText = info.saudacao;

  if (usuarioLogado === "juridico") {
    btnNova.classList.add("d-none");
    menuPendentes.classList.remove("d-none");
    menuHistorico.classList.remove("d-none");
  } else {
    nomeEquipe.classList.remove("d-none");
    nomeEquipe.innerHTML = info.membros.map(n => `<option value="${n}">${n}</option>`).join("");
  }
}

/* CRIAR SOLICITAÇÃO (com loading progress) */
createForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (botaoBloqueado) return;
  botaoBloqueado = true;

  showLoading(true, "Enviando arquivos...", true); // Com progress bar

  const files = [...imagens.files, video.files[0]].filter(Boolean);
  if (files.length === 0) {
    showResultModal("error", "Erro", "Por favor, envie pelo menos uma mídia.");
    showLoading(false);
    botaoBloqueado = false;
    return;
  }

  let links = [];
  const progressStep = 100 / files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const base64 = await fileToBase64(file);
    const formData = new FormData();
    formData.append("action", "upload");
    formData.append("fileName", file.name);
    formData.append("mimeType", file.type);
    formData.append("base64", base64.split(",")[1]);

    const res = await fetch(API_URL, { method: "POST", body: formData });
    const url = await res.text();

    if (url.startsWith("https://")) {
      links.push(url);
    } else {
      showResultModal("error", "Erro no Upload", "Falha ao enviar o arquivo: " + url);
      showLoading(false);
      botaoBloqueado = false;
      return;
    }

    updateProgress((i + 1) * progressStep);
  }

  const nome = usuarioLogado === "juridico" ? info.nomeCriador : nomeEquipe.value;

  const formData = new FormData();
  formData.append("action", "create");
  formData.append("descricao", descricao.value);
  formData.append("prioridade", prioridade.value);
  formData.append("nome", nome);
  formData.append("midias", links.join("|"));

  const res = await fetch(API_URL, { method: "POST", body: formData });
  const result = await res.text();

  showLoading(false);

  if (result === "OK") {
    showResultModal("success", "Sucesso", "Solicitação criada com sucesso.");
    createForm.reset();
    bootstrap.Modal.getInstance(createModal).hide();
    carregarSolicitacoes();
  } else {
    showResultModal("error", "Erro", "Falha ao criar solicitação.");
  }

  botaoBloqueado = false;
});

/* AVALIAR (com loading spinner) */
async function avaliar(id, status) {
  showLoading(true, "Processando avaliação...", false); // Sem progress, só spinner

  let justificativa = "";
  if (status === "Reprovado") {
    justificativa = prompt("Informe a justificativa para reprovação:");
    if (!justificativa) {
      showLoading(false);
      return;
    }
  }

  const formData = new FormData();
  formData.append("action", "updateStatus");
  formData.append("id", id);
  formData.append("status", status);
  formData.append("justificativa", justificativa);

  const res = await fetch(API_URL, { method: "POST", body: formData });
  const result = await res.text();

  showLoading(false);

  if (result === "UPDATED") {
    showResultModal("success", "Avaliação Concluída", `A solicitação foi ${status.toLowerCase()} com sucesso.`);
    carregarSolicitacoes();
  } else {
    showResultModal("error", "Erro na Avaliação", "Falha ao atualizar o status.");
  }
}

/* FUNÇÕES DE LOADING E RESULTADO */
function showLoading(show, message = "Aguardando...", withProgress = false) {
  const overlay = document.getElementById("loadingOverlay");
  document.getElementById("loadingMessage").innerText = message;
  if (withProgress) {
    progressBar.classList.remove("d-none");
    updateProgress(0);
  } else {
    progressBar.classList.add("d-none");
  }
  overlay.classList.toggle("d-flex", show);
  overlay.classList.toggle("d-none", !show);
}

function updateProgress(percent) {
  document.querySelector(".progress-bar").style.width = percent + "%";
}

function showResultModal(type, title, body) {
  const header = document.getElementById("resultHeader");
  header.className = "modal-header " + (type === "success" ? "bg-success text-white" : "bg-danger text-white");
  resultTitle.innerText = title;
  resultBody.innerText = body;
  new bootstrap.Modal(resultModal).show();
}

/* OUTRAS FUNÇÕES (carregarSolicitacoes, filtrar, render, abrirGaleria, etc.) */
async function carregarSolicitacoes() {
  const formData = new FormData();
  formData.append("action", "list");

  const res = await fetch(API_URL, { method: "POST", body: formData });
  listaGlobal = await res.json();

  if (usuarioLogado === "juridico") {
    filtrarPendentes();
  } else {
    renderComunicacao(listaGlobal);
  }
}

// ... Inclua as outras funções como filtrarPendentes, filtrarHistorico, ordenarPorPrioridade, renderJuridico, renderComunicacao, abrirGaleria, formatarData, fileToBase64, logout das versões anteriores.
