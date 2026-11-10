// Carga de dados fictícios para demonstração: `npm run db:seed` (banco vazio).
// Para recomeçar do zero: `npx prisma migrate reset` (apaga tudo) e rode a carga de novo.
//
// Cadastros, parâmetros, lançamentos, certidões, estorno e cancelamento passam pelos services:
// os dados seguem as mesmas regras (Zod, cálculo do IPTU, auditoria) de quem usa as telas.
// A exceção é o passado: o sistema, de propósito, não emite guia com vencimento já passado
// nem aceita pagamento antes da emissão. Para existir histórico (guias de meses atrás, pagas
// ou vencidas), a carga grava essas guias direto no banco, usando o mesmo plano de parcelas
// (`planejarParcelas`) e registrando auditoria com a data em que tudo "aconteceu".
//
// Os dados são sorteados com semente fixa: toda carga gera os mesmos nomes e valores.
// As datas são relativas a hoje, então a demonstração continua coerente em qualquer ano.
import "dotenv/config";
import type { Prisma } from "@/generated/prisma/client";
import { dataParaIso, hojeIso, sugerirVencimento } from "@/lib/datas";
import { validarCnpj, validarCpf } from "@/lib/documento";
import { MUNICIPIO } from "@/lib/municipio";
import { planejarParcelas } from "@/lib/parcelas";
import { contribuinteSchema, type ContribuinteEntrada } from "@/lib/schemas/contribuinte";
import { imovelSchema, type ImovelEntrada, type UsoImovel } from "@/lib/schemas/imovel";
import { parametrosIptuSchema } from "@/lib/schemas/parametros-iptu";
import { prisma } from "@/server/db";
import { emitirCertidao } from "@/server/services/certidoes";
import { criarContribuinte, excluirContribuinte } from "@/server/services/contribuintes";
import { emitirGuias, estornarPagamento, registrarPagamento } from "@/server/services/guias";
import { atualizarImovel, criarImovel } from "@/server/services/imoveis";
import { cancelarLancamento, lancarExercicio, lancarImovel } from "@/server/services/lancamentos-iptu";
import { criarParametros } from "@/server/services/parametros-iptu";
import type { UsuarioLogado } from "@/server/sessao";

// ---------------------------------------------------------------- sorteio com semente

/** Gerador pseudoaleatório (mulberry32): mesma semente, mesma sequência. */
function criarSorteio(semente: number) {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sorteio = criarSorteio(2026);
const inteiro = (minimo: number, maximo: number) => minimo + Math.floor(sorteio() * (maximo - minimo + 1));
const escolher = <T>(lista: readonly T[]) => lista[inteiro(0, lista.length - 1)];
const digitos = (quantidade: number) => Array.from({ length: quantidade }, () => inteiro(0, 9)).join("");
/** Área no formato do formulário ("245,50"). */
const area = (minimo: number, maximo: number) => `${inteiro(minimo, maximo)},${escolher(["00", "50", "25", "75"])}`;

// ---------------------------------------------------------------- CPF e CNPJ válidos

const documentosUsados = new Set<string>();

/** Sorteia a base e procura os dígitos verificadores com a própria validação do sistema. */
function gerarDocumento(base: () => string, validar: (documento: string) => boolean): string {
  for (;;) {
    const inicio = base();
    for (let dv = 0; dv < 100; dv++) {
      const documento = inicio + String(dv).padStart(2, "0");
      if (validar(documento) && !documentosUsados.has(documento)) {
        documentosUsados.add(documento);
        return documento;
      }
    }
  }
}

const gerarCpf = () => gerarDocumento(() => digitos(9), validarCpf);
const gerarCnpj = () => gerarDocumento(() => `${digitos(8)}0001`, validarCnpj);

// ---------------------------------------------------------------- datas

/** Meio-dia no fuso do município: `hojeIso` desse instante devolve o próprio dia. */
const instante = (dia: string) => new Date(`${dia}T12:00:00-03:00`);
const dataDoBanco = (dia: string) => new Date(`${dia}T00:00:00Z`);

function somarDias(dia: string, dias: number): string {
  const data = dataDoBanco(dia);
  data.setUTCDate(data.getUTCDate() + dias);
  return dataParaIso(data);
}

const maiorData = (a: string, b: string) => (a > b ? a : b);
const menorData = (a: string, b: string) => (a < b ? a : b);

// ---------------------------------------------------------------- o município fictício

type Setor = { codigo: string; bairro: string; cep: string; ruas: readonly string[] };

const SETORES = {
  centro: { codigo: "01", bairro: "Centro", cep: "58950-010", ruas: ["Rua Sete de Setembro", "Rua das Flores", "Avenida da Matriz", "Rua do Comércio"] },
  aurora: { codigo: "02", bairro: "Jardim Aurora", cep: "58950-200", ruas: ["Rua dos Ipês", "Rua das Acácias", "Rua dos Girassóis", "Rua das Orquídeas"] },
  industrial: { codigo: "03", bairro: "Distrito Industrial", cep: "58950-400", ruas: ["Avenida dos Industriários", "Rua da Cerâmica", "Rua do Laticínio"] },
  serra: { codigo: "04", bairro: "Alto da Serra", cep: "58950-600", ruas: ["Rua do Mirante", "Rua da Serra", "Travessa do Sol", "Rua das Pedras"] },
} as const satisfies Record<string, Setor>;

/** Próximo lote livre de cada setor: 8 lotes por quadra. */
const lotesUsados = new Map<string, number>();
function proximaInscricao(setor: Setor): string {
  const n = lotesUsados.get(setor.codigo) ?? 0;
  lotesUsados.set(setor.codigo, n + 1);
  const quadra = String(Math.floor(n / 8) + 1).padStart(3, "0");
  const lote = String((n % 8) + 1).padStart(4, "0");
  return `${setor.codigo}${quadra}${lote}001`;
}

const PRIMEIROS_NOMES = [
  "Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João",
  "Larissa", "Marcos", "Natália", "Otávio", "Patrícia", "Rafael", "Sabrina", "Thiago", "Vanessa", "Wagner",
  "Yasmin", "Lucas", "Mariana", "Paulo", "Renata", "Sérgio", "Tatiane", "Caio", "Aline", "Diego",
  "Fernanda", "Gustavo",
];
const SOBRENOMES = [
  "Almeida", "Barbosa", "Cardoso", "Duarte", "Esteves", "Farias", "Gomes", "Holanda", "Lacerda", "Medeiros",
  "Nóbrega", "Oliveira", "Pereira", "Queiroz", "Rocha", "Siqueira", "Teixeira", "Vasconcelos", "Brito", "Cavalcanti",
];

const EMPRESAS: { nome: string; imoveis: { uso: UsoImovel; setor: Setor }[] }[] = [
  { nome: "Padaria Pão da Serra Ltda", imoveis: [{ uso: "COMERCIAL", setor: SETORES.centro }] },
  { nome: "Mercadinho Bom Preço Ltda", imoveis: [{ uso: "COMERCIAL", setor: SETORES.centro }, { uso: "COMERCIAL", setor: SETORES.aurora }] },
  { nome: "Farmácia Vida Serena Ltda", imoveis: [{ uso: "COMERCIAL", setor: SETORES.centro }] },
  { nome: "Oficina Mecânica Aurora Ltda", imoveis: [{ uso: "COMERCIAL", setor: SETORES.aurora }] },
  { nome: "Cerâmica Vale Serena S.A.", imoveis: [{ uso: "INDUSTRIAL", setor: SETORES.industrial }] },
  { nome: "Laticínios Serra Verde Ltda", imoveis: [{ uso: "INDUSTRIAL", setor: SETORES.industrial }] },
  { nome: "Metalúrgica Boa Vista Ltda", imoveis: [{ uso: "INDUSTRIAL", setor: SETORES.industrial }] },
  {
    nome: "Construtora Alto da Serra Ltda",
    imoveis: [{ uso: "COMERCIAL", setor: SETORES.centro }, { uso: "TERRENO", setor: SETORES.serra }, { uso: "TERRENO", setor: SETORES.serra }],
  },
];

/**
 * Como cada contribuinte se comporta com o IPTU. Define a situação fiscal que ele terá hoje.
 * - em-dia-unica: paga a cota única nos dois anos → Regular.
 * - em-dia-parcelado: paga as parcelas no prazo → Regular, com débitos a vencer.
 * - atrasado: pagou o ano passado, parou de pagar este ano → Irregular.
 * - devedor: deve parcelas do ano passado e deste → Irregular.
 * - sem-guia: o IPTU deste ano foi lançado mas ainda não cobrado → Regular, com débitos a vencer.
 */
type Perfil = "em-dia-unica" | "em-dia-parcelado" | "atrasado" | "devedor" | "sem-guia";
const CICLO_PERFIS: Perfil[] = [
  "em-dia-unica", "em-dia-parcelado", "em-dia-parcelado", "atrasado", "em-dia-unica",
  "em-dia-parcelado", "devedor", "em-dia-unica", "sem-guia", "em-dia-parcelado",
];

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
const telefone = () => (sorteio() < 0.2 ? "" : `(83) 9${digitos(4)}-${digitos(4)}`);

// ---------------------------------------------------------------- etapas

const hoje = hojeIso();
const ANO = Number(hoje.slice(0, 4));
const ANTERIOR = ANO - 1;

/** O calendário da história: o sistema "começou a ser usado" em janeiro do ano passado. */
const CALENDARIO = {
  cadastro: `${ANTERIOR}-01-06`,
  parametros: (ano: number) => `${ano}-01-08`,
  lancamento: (ano: number) => `${ano}-01-15`,
  emissao: (ano: number) => `${ano}-02-02`,
  primeiroVencimento: (ano: number) => `${ano}-03-10`,
};

/** Quem fez a carga: um usuário técnico, sem senha (não consegue entrar) e marcado como desativado. */
async function obterResponsavel(): Promise<UsuarioLogado> {
  const email = "carga@gesttrib.example";
  const usuario = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Carga de dados fictícios",
      email,
      role: "administrador",
      banned: true,
      banReason: "Usuário técnico da carga de dados fictícios. Não faz login.",
    },
  });
  return { id: usuario.id, nome: usuario.name, email: usuario.email, perfil: "administrador" };
}

/**
 * Leva a data de criação de registros feitos pelos services (que gravam "agora") para o dia
 * em que a história diz que eles aconteceram, junto com o registro de criação na auditoria.
 */
async function retroagir(tabela: "contribuintes" | "imoveis" | "parametros_iptu" | "lancamentos_iptu", ids: string[], dia: string) {
  const quando = instante(dia);
  const comAtualizacao = tabela !== "lancamentos_iptu";
  await prisma.$transaction([
    prisma.$executeRawUnsafe(
      `UPDATE ${tabela} SET criado_em = $1${comAtualizacao ? ", atualizado_em = $1" : ""} WHERE id = ANY($2::uuid[])`,
      quando,
      ids,
    ),
    prisma.$executeRaw`UPDATE registros_auditoria SET criado_em = ${quando} WHERE acao = 'CRIACAO' AND entidade_id = ANY(${ids}::uuid[])`,
  ]);
}

type Cadastro = { id: string; perfil: Perfil; imoveis: { id: string; entrada: ImovelEntrada }[] };

async function cadastrarContribuinte(entrada: ContribuinteEntrada, responsavel: UsuarioLogado) {
  const contribuinte = await criarContribuinte(contribuinteSchema.parse(entrada), responsavel);
  return contribuinte!;
}

async function cadastrarImovel(entrada: ImovelEntrada, responsavel: UsuarioLogado) {
  const imovel = await criarImovel(imovelSchema.parse(entrada), responsavel);
  return { id: imovel.id, entrada };
}

function entradaImovel(uso: UsoImovel, setor: Setor, documento: string, inscricao = proximaInscricao(setor)): ImovelEntrada {
  const medidas: Record<UsoImovel, [string, string]> = {
    RESIDENCIAL: [area(200, 450), area(70, 220)],
    COMERCIAL: [area(150, 500), area(100, 400)],
    INDUSTRIAL: [area(2000, 8000), area(800, 3000)],
    TERRENO: [area(300, 1000), ""],
  };
  const [areaTerreno, areaConstruida] = medidas[uso];
  return {
    inscricao,
    uso,
    areaTerreno,
    areaConstruida,
    cep: setor.cep,
    logradouro: escolher(setor.ruas),
    numero: String(inteiro(10, 1999)),
    complemento: "",
    bairro: setor.bairro,
    documentoProprietario: documento,
  };
}

async function cadastrar(responsavel: UsuarioLogado): Promise<Cadastro[]> {
  const cadastros: Cadastro[] = [];
  let indicePerfil = 0;
  const proximoPerfil = () => CICLO_PERFIS[indicePerfil++ % CICLO_PERFIS.length];

  // Edifício Serra Azul: seis apartamentos no mesmo lote. O terreno é dividido entre eles no cálculo.
  const loteEdificio = `${SETORES.centro.codigo}0100001`;
  const areaTerrenoEdificio = "1.200,00";

  // Pessoas físicas: as 6 primeiras moram no edifício; as outras, em casas pelos bairros.
  for (let i = 0; i < 30; i++) {
    const [sobrenome1, sobrenome2] = [escolher(SOBRENOMES), escolher(SOBRENOMES)];
    const nome = `${PRIMEIROS_NOMES[i]} ${sobrenome1}${sobrenome1 === sobrenome2 ? "" : ` ${sobrenome2}`}`;
    const documento = gerarCpf();
    const noEdificio = i < 6;
    const setor = noEdificio ? SETORES.centro : escolher([SETORES.centro, SETORES.aurora, SETORES.aurora, SETORES.serra]);
    const moradia = noEdificio
      ? {
          ...entradaImovel("RESIDENCIAL", SETORES.centro, documento, `${loteEdificio}${String(i + 1).padStart(3, "0")}`),
          areaTerreno: areaTerrenoEdificio,
          areaConstruida: area(60, 110),
          logradouro: "Avenida da Matriz",
          numero: "500",
          complemento: `Apto ${Math.floor(i / 2) + 1}0${(i % 2) + 1}`,
        }
      : entradaImovel("RESIDENCIAL", setor, documento);

    // Dois contribuintes moram fora do município; os demais, no próprio imóvel.
    const foraDoMunicipio = i === 12 || i === 23;
    const contribuinte = await cadastrarContribuinte(
      {
        tipoPessoa: "FISICA",
        documento,
        nome,
        email: sorteio() < 0.25 ? "" : `${semAcento(PRIMEIROS_NOMES[i]).toLowerCase()}.${semAcento(sobrenome1).toLowerCase()}@email.example`,
        telefone: telefone(),
        cep: foraDoMunicipio ? "58400-100" : moradia.cep,
        logradouro: foraDoMunicipio ? "Rua Getúlio Vargas" : moradia.logradouro,
        numero: foraDoMunicipio ? String(inteiro(10, 999)) : moradia.numero,
        complemento: foraDoMunicipio ? "" : moradia.complemento,
        bairro: foraDoMunicipio ? "Centro" : moradia.bairro,
        cidade: foraDoMunicipio ? "Campina Grande" : MUNICIPIO.nome,
        uf: MUNICIPIO.uf,
      },
      responsavel,
    );

    const imoveis = [await cadastrarImovel(moradia, responsavel)];
    // Alguns também têm um terreno vazio no Alto da Serra.
    if (i % 7 === 3) imoveis.push(await cadastrarImovel(entradaImovel("TERRENO", SETORES.serra, documento), responsavel));
    cadastros.push({ id: contribuinte.id, perfil: proximoPerfil(), imoveis });
  }

  for (const empresa of EMPRESAS) {
    const documento = gerarCnpj();
    const sede = empresa.imoveis[0];
    const imoveisEntrada = empresa.imoveis.map((imovel) => entradaImovel(imovel.uso, imovel.setor, documento));
    const contribuinte = await cadastrarContribuinte(
      {
        tipoPessoa: "JURIDICA",
        documento,
        nome: empresa.nome,
        email: `contato@${semAcento(empresa.nome.split(" ")[0]).toLowerCase()}.example`,
        telefone: `(83) 3${digitos(3)}-${digitos(4)}`,
        cep: sede.setor.cep,
        logradouro: imoveisEntrada[0].logradouro,
        numero: imoveisEntrada[0].numero,
        complemento: "",
        bairro: sede.setor.bairro,
        cidade: MUNICIPIO.nome,
        uf: MUNICIPIO.uf,
      },
      responsavel,
    );
    const imoveis = [];
    for (const entrada of imoveisEntrada) imoveis.push(await cadastrarImovel(entrada, responsavel));
    cadastros.push({ id: contribuinte.id, perfil: proximoPerfil(), imoveis });
  }

  await retroagir("contribuintes", cadastros.map((c) => c.id), CALENDARIO.cadastro);
  await retroagir("imoveis", cadastros.flatMap((c) => c.imoveis.map((i) => i.id)), CALENDARIO.cadastro);
  return cadastros;
}

/** Parâmetros do ano passado e deste, com reajuste de cerca de 5%. */
async function cadastrarParametros(responsavel: UsuarioLogado) {
  const anos = [
    { exercicio: ANTERIOR, residencial: "1.150,00", comercial: "1.430,00", industrial: "860,00", terrenos: ["305,00", "170,00", "90,00", "133,00"] },
    { exercicio: ANO, residencial: "1.200,00", comercial: "1.500,00", industrial: "900,00", terrenos: ["320,00", "180,00", "95,00", "140,00"] },
  ];
  for (const ano of anos) {
    const parametros = await criarParametros(
      parametrosIptuSchema.parse({
        exercicio: String(ano.exercicio),
        aliquotaResidencial: "0,80",
        aliquotaComercial: "1,20",
        aliquotaIndustrial: "1,20",
        aliquotaTerreno: "2,00",
        valorM2Residencial: ano.residencial,
        valorM2Comercial: ano.comercial,
        valorM2Industrial: ano.industrial,
        terrenos: Object.fromEntries(Object.values(SETORES).map((setor, i) => [setor.codigo, ano.terrenos[i]])),
      }),
      responsavel,
    );
    await retroagir("parametros_iptu", [parametros.id], CALENDARIO.parametros(ano.exercicio));
  }
}

async function lancar(exercicio: number, responsavel: UsuarioLogado) {
  await lancarExercicio(exercicio, responsavel);
  const lancamentos = await prisma.lancamentoIptu.findMany({ where: { exercicio, vigente: true } });
  await retroagir("lancamentos_iptu", lancamentos.map((l) => l.id), CALENDARIO.lancamento(exercicio));
  return lancamentos;
}

type Lancamento = Awaited<ReturnType<typeof lancar>>[number];

/**
 * Guias emitidas no passado e os pagamentos delas, cada um na data em que aconteceu.
 * `pagar` diz quais parcelas (pelo número) o contribuinte pagou; só paga o que já venceu
 * ou foi pago antes de hoje, nunca uma data futura.
 */
async function emitirComHistorico(lancamento: Lancamento, quantidade: number, pagar: (parcela: number) => boolean, responsavel: UsuarioLogado) {
  const exercicio = lancamento.exercicio;
  const emitidaEm = CALENDARIO.emissao(exercicio);
  const plano = planejarParcelas(lancamento.valorImposto.toFixed(2), quantidade, CALENDARIO.primeiroVencimento(exercicio));

  await prisma.$transaction(async (tx) => {
    const guias = await tx.guia.createManyAndReturn({
      data: plano.map((p) => ({
        lancamentoId: lancamento.id,
        parcela: p.numero,
        totalParcelas: plano.length,
        valor: p.valor,
        vencimento: dataDoBanco(p.vencimento),
        criadoEm: instante(emitidaEm),
      })),
    });
    const auditoria: Prisma.RegistroAuditoriaCreateManyInput[] = guias.map((guia) => ({
      entidade: "Guia",
      entidadeId: guia.id,
      acao: "CRIACAO",
      dados: JSON.parse(JSON.stringify(guia)),
      usuarioId: responsavel.id,
      criadoEm: instante(emitidaEm),
    }));

    for (const guia of guias) {
      const vencimento = dataParaIso(guia.vencimento);
      if (vencimento >= hoje || !pagar(guia.parcela)) continue;
      // Paga até 10 dias antes do vencimento, nunca antes da emissão.
      const pagoEm = menorData(maiorData(somarDias(vencimento, -inteiro(0, 10)), emitidaEm), hoje);
      const valorPago = guia.valor.toFixed(2);
      await tx.pagamento.create({ data: { guiaId: guia.id, dataPagamento: dataDoBanco(pagoEm), valorPago, criadoEm: instante(pagoEm) } });
      await tx.guia.update({ where: { id: guia.id }, data: { situacao: "PAGA" } });
      auditoria.push({
        entidade: "Guia",
        entidadeId: guia.id,
        acao: "ALTERACAO",
        dados: { campo: "situacao", para: "paga", dataPagamento: pagoEm, valorPago },
        usuarioId: responsavel.id,
        criadoEm: instante(pagoEm),
      });
    }
    await tx.registroAuditoria.createMany({ data: auditoria });
  });
}

async function cobrarAnterior(cadastros: Cadastro[], lancamentos: Lancamento[], responsavel: UsuarioLogado) {
  const perfilDe = new Map(cadastros.map((c) => [c.id, c.perfil]));
  for (const lancamento of lancamentos) {
    const perfil = perfilDe.get(lancamento.contribuinteId)!;
    if (perfil === "em-dia-unica" || perfil === "sem-guia") await emitirComHistorico(lancamento, 1, () => true, responsavel);
    else if (perfil === "devedor") await emitirComHistorico(lancamento, 10, (parcela) => parcela <= 3, responsavel);
    else await emitirComHistorico(lancamento, 10, () => true, responsavel);
  }
}

async function cobrarAtual(cadastros: Cadastro[], lancamentos: Lancamento[], responsavel: UsuarioLogado) {
  // Antes da emissão deste ano (início de fevereiro), todo o IPTU do ano fica "a emitir".
  if (hoje < CALENDARIO.emissao(ANO)) return;
  const perfilDe = new Map(cadastros.map((c) => [c.id, c.perfil]));
  for (const lancamento of lancamentos) {
    const perfil = perfilDe.get(lancamento.contribuinteId)!;
    if (perfil === "em-dia-unica") await emitirComHistorico(lancamento, 1, () => true, responsavel);
    else if (perfil === "em-dia-parcelado") await emitirComHistorico(lancamento, 10, () => true, responsavel);
    else if (perfil === "atrasado") await emitirComHistorico(lancamento, 10, (parcela) => parcela <= 4, responsavel);
    else if (perfil === "devedor") await emitirComHistorico(lancamento, 10, () => false, responsavel);
    // sem-guia: fica a emitir.
  }
}

/** O dia a dia de hoje, pelos services: tudo com a data real e auditoria normal. */
async function operacoesDeHoje(cadastros: Cadastro[], responsavel: UsuarioLogado) {
  const lancamentoAtual = (imovelId: string) =>
    prisma.lancamentoIptu.findFirstOrThrow({ where: { imovelId, exercicio: ANO, vigente: true } });
  const dosPerfis = (perfil: Perfil) => cadastros.filter((c) => c.perfil === perfil);
  const [semGuia1, semGuia2] = dosPerfis("sem-guia");
  const [parcelado1, parcelado2] = dosPerfis("em-dia-parcelado");

  // Vistoria encontrou área construída maior: corrige o imóvel, cancela o IPTU do ano e lança de novo.
  const imovel = semGuia1.imoveis[0];
  await atualizarImovel(imovel.id, imovelSchema.parse({ ...imovel.entrada, areaConstruida: area(230, 280) }), responsavel);
  await cancelarLancamento((await lancamentoAtual(imovel.id)).id, "Área construída corrigida após vistoria fiscal.", responsavel);
  await lancarImovel(imovel.id, ANO, responsavel);

  // Guias emitidas hoje, em duas parcelas, para quem ainda não tinha cobrança deste ano.
  if (semGuia2) {
    await emitirGuias((await lancamentoAtual(semGuia2.imoveis[0].id)).id, { quantidade: 2, primeiroVencimento: sugerirVencimento(hoje) }, responsavel);
  }

  // Baixa registrada na guia errada: estorna e registra de novo.
  const paga = await prisma.guia.findFirst({
    where: { situacao: "PAGA", lancamento: { exercicio: ANO, imovelId: parcelado1.imoveis[0].id } },
    orderBy: { parcela: "desc" },
  });
  if (paga) {
    await estornarPagamento(paga.id, "Pagamento registrado na guia de outro contribuinte.", responsavel);
    await registrarPagamento(paga.id, { dataPagamento: hoje, valorPago: paga.valor.toFixed(2) }, responsavel);
  }

  // Pagamento antecipado da próxima parcela.
  const proxima = await prisma.guia.findFirst({
    where: { situacao: "ABERTA", lancamento: { exercicio: ANO, imovelId: parcelado2.imoveis[0].id } },
    orderBy: { parcela: "asc" },
  });
  if (proxima) await registrarPagamento(proxima.id, { dataPagamento: hoje, valorPago: proxima.valor.toFixed(2) }, responsavel);

  // Uma certidão de cada tipo: negativa, positiva com efeito de negativa e positiva.
  for (const perfil of ["em-dia-unica", "em-dia-parcelado", "devedor"] as const) {
    await emitirCertidao(dosPerfis(perfil)[0].id, responsavel);
  }

  // Cadastros recentes: dois contribuintes ainda sem imóvel e um excluído por engano de cadastro.
  for (const i of [30, 31]) {
    const nome = `${PRIMEIROS_NOMES[i]} ${escolher(SOBRENOMES)} ${escolher(SOBRENOMES)}`;
    await cadastrarContribuinte(
      {
        tipoPessoa: "FISICA", documento: gerarCpf(), nome, email: "", telefone: telefone(),
        cep: SETORES.aurora.cep, logradouro: escolher(SETORES.aurora.ruas), numero: String(inteiro(10, 999)),
        complemento: "", bairro: SETORES.aurora.bairro, cidade: MUNICIPIO.nome, uf: MUNICIPIO.uf,
      },
      responsavel,
    );
  }
  const duplicado = await cadastrarContribuinte(
    {
      tipoPessoa: "JURIDICA", documento: gerarCnpj(), nome: "Padaria Pao da Serra (cadastro duplicado)", email: "", telefone: "",
      cep: SETORES.centro.cep, logradouro: "Rua do Comércio", numero: "12", complemento: "",
      bairro: SETORES.centro.bairro, cidade: MUNICIPIO.nome, uf: MUNICIPIO.uf,
    },
    responsavel,
  );
  await excluirContribuinte(duplicado.id, responsavel);
}

async function main() {
  if ((await prisma.contribuinte.count()) > 0) {
    console.error("✗ O banco já tem contribuintes. A carga só roda num banco vazio.");
    console.error("  Para apagar tudo e recomeçar: npx prisma migrate reset");
    process.exitCode = 1;
    return;
  }

  console.log(`Carga de dados fictícios (hoje: ${hoje})`);
  const responsavel = await obterResponsavel();

  const cadastros = await cadastrar(responsavel);
  console.log(`✓ ${cadastros.length} contribuintes e ${cadastros.flatMap((c) => c.imoveis).length} imóveis`);

  await cadastrarParametros(responsavel);
  console.log(`✓ Parâmetros do IPTU ${ANTERIOR} e ${ANO}`);

  await cobrarAnterior(cadastros, await lancar(ANTERIOR, responsavel), responsavel);
  await cobrarAtual(cadastros, await lancar(ANO, responsavel), responsavel);
  console.log(`✓ IPTU ${ANTERIOR} e ${ANO} lançado, com guias e pagamentos`);

  await operacoesDeHoje(cadastros, responsavel);
  console.log("✓ Operações de hoje: estorno, cancelamento, emissão, baixa, certidões e cadastros");

  const [guias, pagamentos, certidoes] = await Promise.all([
    prisma.guia.groupBy({ by: ["situacao"], _count: true }),
    prisma.pagamento.count({ where: { vigente: true } }),
    prisma.certidao.count(),
  ]);
  const resumoGuias = guias.map((g) => `${g._count} ${g.situacao.toLowerCase()}`).join(", ");
  console.log(`\nGuias: ${resumoGuias} · Pagamentos: ${pagamentos} · Certidões: ${certidoes}`);
  console.log("Pronto. Para entrar, crie um administrador (npm run criar-admin) ou as contas demo (npm run criar-demo).");
}

main()
  .catch((erro) => {
    console.error("✗ A carga falhou:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
