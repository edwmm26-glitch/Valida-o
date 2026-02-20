const API_URL = "https://script.google.com/macros/s/AKfycbyVScX9AfEPdzIlO4SGf0srqDt9EK48plPh1Nol6fpxMkLs1dToSJ973LpwT_KzJaOwIA/exec";

let usuarioLogado = "";
let listaGlobal = [];
let botaoBloqueado = false;

const EQUIPE = {
  juridico: ["Dr. Ismênia"],
  comunicacao: ["Cauã", "Celyne", "Caio"]
};

/* LOGIN */
loginForm.addEventListener("submit", async e => {
  e.preventDefault();

  const usuario = usuarioInput.value.trim();
  const senha = senhaInput.value;

  const formData = new FormData();
  formData.append("action", "login");
  formData.append("usuario", usuario);
  formData.append("senha", senha);

  try {
    const res = await fetch(API_URL, { method: "POST", body: formData });
    const result = await res.text();

    if (result.startsWith("OK:")) {
      usuarioLogado = result.split(":")[1];  // "comunicacao" ou "juridico"

      loginPage.classList.add("d-none");
      mainPage.classList.remove("d-none");

      configurarTela();
      carregarSolicitacoes();
    } else {
      loginError.innerText = result || "Usuário ou senha inválidos";
      loginError.classList.remove("d-none");
    }
  } catch (err) {
    loginError.innerText = "Erro de conexão. Tente novamente.";
    loginError.classList.remove("d-none");
  }
});

/* CONFIGURA TELA */
function configurarTela() {
  if (usuarioLogado === "juridico") {
    saudacao.innerText = "Bem-vinda, Dra. Ismênia 👩‍⚖️";
    btnNova.classList.add("d-none");
    menuPendentes.classList.remove("d-none");
    menuHistorico.classList.remove("d-none");
  } else {
    saudacao.innerText = "Bem-vinda, Equipe de Comunicação 🎨";
    nomeEquipe.classList.remove("d-none");
    nomeEquipe.innerHTML = EQUIPE.comunicacao.map(n => `<option>${n}</option>`).join("");
    menuPendentes.classList.add("d-none");
    menuHistorico.classList.add("d-none");
  }
}

// ... o resto do código continua igual (createForm submit, carregarSolicitacoes, filtrarPendentes, renderJuridico, renderComunicacao, abrirGaleria, avaliar, utils, etc.)
// Copie as funções de upload para Drive, galeria, toast, etc. dos códigos anteriores
