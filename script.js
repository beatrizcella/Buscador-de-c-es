const API_DOGS = 'https://dog.ceo/api';
const API_LOGS = 'https://www.piway.com.br/unoesc/api';
const MATRICULA = '461570';
const NOME_API = 'THEDOGAPI';
const TAMANHO_PAGINA = 24;

let mapaRacas = {};
let imagens = [];
let quantidadeMostrada = 0;
let ultimaRaca = null;

async function registrarLog(metodo, resultado) {
  await fetch(`${API_LOGS}/inserir/log/${MATRICULA}/${NOME_API}/${metodo}/${encodeURIComponent(resultado)}`);
}

function mostrarAlerta(mensagem, tipo) {
  const alerta = document.getElementById('alertBox');
  alerta.className = `alert alert-${tipo} mt-3 mb-0`;
  alerta.textContent = mensagem;
}

function lerRaca() {
  document.getElementById('alertBox').className = 'alert d-none mt-3 mb-0';
  const chave = document.getElementById('breedInput').value.trim().toLowerCase();

  if (!mapaRacas[chave]) {
    mostrarAlerta(`A raça "${chave}" não foi encontrada.`, 'warning');
    return null;
  }
  return { chave, ...mapaRacas[chave] };
}

function caminho(info) {
  return info.sub ? `${info.raca}/${info.sub}` : info.raca;
}

async function carregarRacas() {
  const resposta = await fetch(`${API_DOGS}/breeds/list/all`);
  const dados = await resposta.json();

  let opcoes = '';
  for (const raca in dados.message) {
    mapaRacas[raca] = { raca: raca, sub: null };
    opcoes += `<option value="${raca}"></option>`;
    for (const sub of dados.message[raca]) {
      mapaRacas[`${sub} ${raca}`] = { raca: raca, sub: sub };
      opcoes += `<option value="${sub} ${raca}"></option>`;
    }
  }
  document.getElementById('breedList').innerHTML = opcoes;

  await registrarLog('breeds-list-all', `${Object.keys(dados.message).length} raças recebidas`);
}

async function buscarSubRacas() {
  const info = lerRaca();
  if (!info) return;

  const resposta = await fetch(`${API_DOGS}/breed/${info.raca}/list`);
  const dados = await resposta.json();

  await registrarLog('breed-list', `${dados.message.length} sub-raças de ${info.raca}`);

  let botoes = '';
  for (const sub of dados.message) {
    botoes += `<button type="button" class="btn btn-sm btn-outline-laranja" onclick="selecionarSub('${sub}', '${info.raca}')">${sub}</button>`;
  }

  document.getElementById('subBreedsTitle').textContent = `Sub-raças de ${info.raca}`;
  document.getElementById('subBreedsList').innerHTML = botoes;
  document.getElementById('subBreedsEmpty').textContent = `A raça ${info.raca} não possui sub-raças.`;
  document.getElementById('subBreedsEmpty').classList.toggle('d-none', dados.message.length > 0);
  document.getElementById('subBreedsSection').classList.remove('d-none');
}

function selecionarSub(sub, raca) {
  document.getElementById('breedInput').value = `${sub} ${raca}`;
  buscarGaleria();
}

async function buscarGaleria() {
  const info = lerRaca();
  if (!info) return;

  const resposta = await fetch(`${API_DOGS}/breed/${caminho(info)}/images`);
  const dados = await resposta.json();

  await registrarLog('breed-images', `${dados.message.length} imagens de ${info.chave}`);

  imagens = dados.message;
  quantidadeMostrada = 0;
  document.getElementById('gallery').innerHTML = '';
  document.getElementById('galleryTitle').textContent = `Galeria: ${info.chave}`;
  document.getElementById('gallerySection').classList.remove('d-none');
  mostrarMais();
}

function mostrarMais() {
  const proximas = imagens.slice(quantidadeMostrada, quantidadeMostrada + TAMANHO_PAGINA);

  let html = '';
  for (const url of proximas) {
    html += `
      <div class="col">
        <div class="card h-100 shadow-sm">
          <img src="${url}" class="card-img-top dog-img" alt="Foto de cachorro" loading="lazy">
        </div>
      </div>`;
  }

  document.getElementById('gallery').insertAdjacentHTML('beforeend', html);
  quantidadeMostrada += proximas.length;
  document.getElementById('loadMoreBtn').classList.toggle('d-none', quantidadeMostrada >= imagens.length);
}

async function buscarFotoAleatoria(info) {
  const rota = info ? `breed/${caminho(info)}/images/random` : 'breeds/image/random';
  const resposta = await fetch(`${API_DOGS}/${rota}`);
  const dados = await resposta.json();

  const metodo = info ? 'breed-images-random' : 'breeds-image-random';
  const origem = info ? info.chave : 'qualquer raça';
  await registrarLog(metodo, `1 foto recebida (${origem})`);

  ultimaRaca = info;
  document.getElementById('randomImg').src = dados.message;
  document.getElementById('randomCaption').textContent = info
    ? `Foto aleatória da raça: ${info.chave}`
    : 'Foto aleatória de qualquer raça';
  document.getElementById('randomSection').classList.remove('d-none');
}

function fotoDaRaca() {
  const info = lerRaca();
  if (info) buscarFotoAleatoria(info);
}

function fotoQualquerRaca() {
  buscarFotoAleatoria(null);
}

function novaFoto() {
  buscarFotoAleatoria(ultimaRaca);
}

async function carregarLogs() {
  document.getElementById('logsSection').classList.remove('d-none');
  const lista = document.getElementById('logsList');

  const resposta = await fetch(`${API_LOGS}/logs/${MATRICULA}`);
  const texto = await resposta.text();

  if (!texto.startsWith('[')) {
    lista.innerHTML = `<p class="text-danger mb-0">${texto}</p>`;
    return;
  }

  const logs = JSON.parse(texto);
  let html = '';
  for (const log of logs) {
    html += `
      <div class="d-flex justify-content-between align-items-center border-bottom py-2 gap-2">
        <span class="small">${MATRICULA} - ${log.idlog} - ${log.log} - ${log.api} - ${log.metodo} - ${log.resultado}</span>
        <button type="button" class="btn btn-sm btn-outline-laranja" onclick="excluirLog(${log.idlog})">Excluir</button>
      </div>`;
  }

  lista.innerHTML = html || '<p class="text-muted mb-0">Nenhum log registrado.</p>';
}

async function excluirLog(idLog) {
  const mensagemEl = document.getElementById('logsMensagem');
  const resposta = await fetch(`${API_LOGS}/excluir/log/${idLog}/aluno/${MATRICULA}`);
  const mensagem = await resposta.text();

  await carregarLogs();
  mensagemEl.textContent = mensagem;
}

document.getElementById('btnSubBreeds').addEventListener('click', buscarSubRacas);
document.getElementById('btnGallery').addEventListener('click', buscarGaleria);
document.getElementById('btnBreedRandom').addEventListener('click', fotoDaRaca);
document.getElementById('btnRandom').addEventListener('click', fotoQualquerRaca);
document.getElementById('btnRandomAgain').addEventListener('click', novaFoto);
document.getElementById('loadMoreBtn').addEventListener('click', mostrarMais);

document.getElementById('btnLogs').addEventListener('click', () => {
  document.getElementById('logsMensagem').textContent = '';
  carregarLogs();
});

document.getElementById('closeSubBreeds').addEventListener('click', () => {
  document.getElementById('subBreedsSection').classList.add('d-none');
});

document.getElementById('closeGallery').addEventListener('click', () => {
  document.getElementById('gallerySection').classList.add('d-none');
  document.getElementById('gallery').innerHTML = '';
  document.getElementById('loadMoreBtn').classList.add('d-none');
});

document.getElementById('closeRandom').addEventListener('click', () => {
  document.getElementById('randomSection').classList.add('d-none');
});

document.getElementById('closeLogs').addEventListener('click', () => {
  document.getElementById('logsSection').classList.add('d-none');
});

document.getElementById('breedInput').addEventListener('keydown', event => {
  if (event.key === 'Enter') buscarGaleria();
});

carregarRacas();