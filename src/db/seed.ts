import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { putImage } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import { db } from "./index";
import { placeholderPng } from "./placeholder-image";
import {
  categories,
  conversations,
  listingImages,
  listings,
  messages,
  moderators,
  profiles,
  reports,
  reviews,
  user,
} from "./schema";

/**
 * Popula o banco com um recorte realista para desenvolvimento e demonstração.
 *
 * O script é idempotente: apaga o conteúdo das tabelas de domínio antes de
 * inserir. As contas são criadas pela própria API do Better Auth para que a
 * senha passe pelo mesmo algoritmo de hash usado em produção.
 */

const CATEGORIES = [
  {
    slug: "educacao",
    name: "Educação",
    icon: "graduation-cap",
    description: "Aulas, reforço escolar, idiomas e mentoria.",
  },
  {
    slug: "casa-e-reparos",
    name: "Casa e reparos",
    icon: "hammer",
    description: "Manutenção, marcenaria, elétrica e hidráulica.",
  },
  {
    slug: "tecnologia",
    name: "Tecnologia",
    icon: "laptop",
    description: "Suporte, desenvolvimento e recuperação de equipamentos.",
  },
  {
    slug: "saude-e-bem-estar",
    name: "Saúde e bem-estar",
    icon: "heart-pulse",
    description: "Acompanhamento, terapias e atividade física.",
  },
  {
    slug: "mobilidade",
    name: "Mobilidade",
    icon: "bike",
    description: "Caronas, transporte de itens e empréstimo de veículos.",
  },
  {
    slug: "alimentacao",
    name: "Alimentação",
    icon: "utensils",
    description: "Doação de alimentos, cozinha comunitária e hortas.",
  },
  {
    slug: "moveis-e-utensilios",
    name: "Móveis e utensílios",
    icon: "sofa",
    description: "Doação e troca de móveis, eletrodomésticos e utensílios.",
  },
  {
    slug: "animais",
    name: "Animais",
    icon: "paw-print",
    description: "Cuidado, adoção responsável e transporte de animais.",
  },
];

const PEOPLE = [
  {
    name: "Ana Ribeiro",
    email: "ana@exemplo.test",
    city: "Recife",
    state: "PE",
    latitude: -8.0476,
    longitude: -34.877,
    headline: "Professora de matemática, disponível à noite",
  },
  {
    name: "Bruno Cavalcanti",
    email: "bruno@exemplo.test",
    city: "Olinda",
    state: "PE",
    latitude: -8.0089,
    longitude: -34.8553,
    headline: "Marceneiro há 12 anos",
  },
  {
    name: "Carla Nunes",
    email: "carla@exemplo.test",
    city: "Jaboatão dos Guararapes",
    state: "PE",
    latitude: -8.1128,
    longitude: -35.0147,
    headline: "Analista de sistemas",
  },
  {
    name: "Diego Santos",
    email: "diego@exemplo.test",
    city: "São Paulo",
    state: "SP",
    latitude: -23.5505,
    longitude: -46.6333,
    headline: "Voluntário em projetos de bairro",
  },
  {
    name: "Elisa Moreira",
    email: "elisa@exemplo.test",
    city: "Rio de Janeiro",
    state: "RJ",
    latitude: -22.9068,
    longitude: -43.1729,
    headline: "Fisioterapeuta",
  },
  {
    name: "Felipe Andrade",
    email: "felipe@exemplo.test",
    city: "Belo Horizonte",
    state: "MG",
    latitude: -19.9167,
    longitude: -43.9345,
    headline: "Ciclista e mecânico amador",
  },
  {
    name: "Equipe de moderação",
    email: "moderacao@exemplo.test",
    city: "Recife",
    state: "PE",
    latitude: -8.0476,
    longitude: -34.877,
    headline: "Cuida das denúncias da plataforma",
  },
  {
    name: "Equipe de revisão",
    email: "revisao@exemplo.test",
    city: "Recife",
    state: "PE",
    latitude: -8.0476,
    longitude: -34.877,
    headline: "Revisa contestações de decisões da moderação",
  },
];

/**
 * A equipe do seed, com os dois papéis.
 *
 * São **duas** pessoas de propósito: quem toma uma decisão não pode julgar a
 * contestação dela, então uma equipe de um só deixaria toda contestação
 * travada — e a regra pareceria defeito.
 */
const STAFF: { email: string; role: "moderator" | "admin" }[] = [
  { email: "moderacao@exemplo.test", role: "admin" },
  { email: "revisao@exemplo.test", role: "moderator" },
];

const MODERATOR_EMAIL = "moderacao@exemplo.test";

const SEED_PASSWORD = "collabcity-demo-2026";

type ListingSeed = {
  author: string;
  category: string;
  intent: "need" | "offer";
  resourceType: "skill" | "item" | "volunteer";
  exchange: "free" | "trade" | "paid";
  priceCents?: number;
  title: string;
  description: string;
};

const LISTINGS: ListingSeed[] = [
  {
    author: "ana@exemplo.test",
    category: "educacao",
    intent: "offer",
    resourceType: "skill",
    exchange: "free",
    title: "Reforço de matemática para o ensino fundamental",
    description:
      "Sou professora da rede pública e tenho duas noites livres por semana. Ofereço reforço gratuito de matemática para estudantes do 6º ao 9º ano, presencialmente na biblioteca do bairro ou por chamada de vídeo. Consigo atender até quatro estudantes por turma.",
  },
  {
    author: "ana@exemplo.test",
    category: "tecnologia",
    intent: "need",
    resourceType: "item",
    exchange: "free",
    title: "Preciso de um notebook usado para aulas online",
    description:
      "Estou montando um pequeno laboratório para as aulas de reforço e preciso de um notebook, mesmo antigo, que rode um navegador. Pode estar com bateria ruim, uso na tomada mesmo. Retiro no local.",
  },
  {
    author: "bruno@exemplo.test",
    category: "casa-e-reparos",
    intent: "offer",
    resourceType: "skill",
    exchange: "trade",
    title: "Conserto móveis de madeira em troca de aulas de inglês",
    description:
      "Trabalho com marcenaria há doze anos. Conserto cadeiras, mesas, portas e gavetas. Estou aprendendo inglês e gostaria de trocar serviços por aulas de conversação, uma hora por semana.",
  },
  {
    author: "bruno@exemplo.test",
    category: "moveis-e-utensilios",
    intent: "offer",
    resourceType: "item",
    exchange: "free",
    title: "Doação de sobras de madeira de demolição",
    description:
      "Sempre sobram peças boas de madeira maciça no fim das obras. Separo por tamanho e doo para quem faz artesanato, horta vertical ou móveis pequenos. Tenho estoque quase toda semana.",
  },
  {
    author: "carla@exemplo.test",
    category: "tecnologia",
    intent: "offer",
    resourceType: "skill",
    exchange: "free",
    title: "Recupero computadores antigos para uso em ONGs",
    description:
      "Instalo sistemas leves em máquinas antigas para que voltem a servir para navegação e escritório. Já recuperei mais de trinta computadores. Atendo organizações e projetos comunitários da Região Metropolitana do Recife.",
  },
  {
    author: "carla@exemplo.test",
    category: "educacao",
    intent: "need",
    resourceType: "volunteer",
    exchange: "free",
    title: "Procuro voluntários para oficina de robótica",
    description:
      "Estamos organizando uma oficina de robótica com kits reaproveitados para adolescentes. Preciso de duas pessoas para acompanhar as bancadas nos sábados de manhã durante seis semanas. Não é necessário ter experiência com robótica, só disposição.",
  },
  {
    author: "diego@exemplo.test",
    category: "alimentacao",
    intent: "need",
    resourceType: "volunteer",
    exchange: "free",
    title: "Mutirão da horta comunitária precisa de gente",
    description:
      "A horta do nosso bairro está em expansão e precisamos de ajuda no preparo dos canteiros. O mutirão acontece um domingo por mês, das 8h às 12h. Fornecemos ferramentas, luvas e o café da manhã.",
  },
  {
    author: "diego@exemplo.test",
    category: "mobilidade",
    intent: "offer",
    resourceType: "item",
    exchange: "free",
    title: "Empresto carrinho de carga para mudanças pequenas",
    description:
      "Tenho um carrinho de carga dobrável que fica parado a maior parte do tempo. Empresto para mudanças pequenas, feiras e mutirões. Basta combinar a retirada e devolver limpo.",
  },
  {
    author: "elisa@exemplo.test",
    category: "saude-e-bem-estar",
    intent: "offer",
    resourceType: "skill",
    exchange: "paid",
    priceCents: 8000,
    title: "Atendimento de fisioterapia domiciliar",
    description:
      "Atendo pessoas idosas e pacientes em recuperação pós-cirúrgica na região central. A primeira avaliação é gratuita e as sessões seguintes têm valor social. Tenho disponibilidade nas manhãs de terça e quinta.",
  },
  {
    author: "elisa@exemplo.test",
    category: "saude-e-bem-estar",
    intent: "need",
    resourceType: "item",
    exchange: "free",
    title: "Preciso de andadores para emprestar a pacientes",
    description:
      "Muitos pacientes precisam de andador apenas por algumas semanas e não têm como comprar. Estou montando um pequeno acervo para empréstimo gratuito. Aceito equipamentos usados, mesmo precisando de pequeno reparo.",
  },
  {
    author: "felipe@exemplo.test",
    category: "mobilidade",
    intent: "offer",
    resourceType: "skill",
    exchange: "free",
    title: "Oficina aberta de manutenção de bicicletas",
    description:
      "Todo sábado de manhã abro minha bancada na praça para ensinar manutenção básica: ajuste de freio, câmbio, troca de câmara e lubrificação. Levo as ferramentas, você leva a bicicleta.",
  },
  {
    author: "felipe@exemplo.test",
    category: "animais",
    intent: "need",
    resourceType: "volunteer",
    exchange: "free",
    title: "Transporte voluntário para castração de gatos",
    description:
      "Um grupo de protetoras precisa levar gatos para castração em uma clínica parceira. Procuramos pessoas com carro disponíveis em manhãs de quarta-feira, uma vez por mês. As caixas de transporte são nossas.",
  },
  {
    author: "ana@exemplo.test",
    category: "educacao",
    intent: "need",
    resourceType: "skill",
    exchange: "trade",
    title: "Troco aulas de matemática por aulas de violão",
    description:
      "Quero aprender violão do zero e posso oferecer em troca aulas de matemática para você ou alguém da sua família. Tenho paciência de sobra e material didático próprio.",
  },
  {
    author: "bruno@exemplo.test",
    category: "casa-e-reparos",
    intent: "need",
    resourceType: "item",
    exchange: "free",
    title: "Procuro furadeira emprestada por um fim de semana",
    description:
      "A minha queimou no meio de um trabalho voluntário de reforma numa creche. Preciso de uma furadeira de impacto emprestada por dois dias. Devolvo com as brocas repostas.",
  },
  {
    author: "carla@exemplo.test",
    category: "tecnologia",
    intent: "offer",
    resourceType: "skill",
    exchange: "paid",
    priceCents: 15000,
    title: "Criação de site simples para pequenos negócios",
    description:
      "Monto sites de uma página para negócios de bairro, com formulário de contato e integração com redes sociais. O valor cobre domínio e hospedagem do primeiro ano. Para projetos comunitários, faço sem custo.",
  },
  {
    author: "diego@exemplo.test",
    category: "alimentacao",
    intent: "offer",
    resourceType: "item",
    exchange: "free",
    title: "Doação semanal de hortaliças da horta comunitária",
    description:
      "Toda quinta-feira sobram hortaliças da colheita coletiva. Distribuímos gratuitamente para famílias do bairro e para cozinhas solidárias. Basta avisar com um dia de antecedência.",
  },
  {
    author: "elisa@exemplo.test",
    category: "saude-e-bem-estar",
    intent: "offer",
    resourceType: "volunteer",
    exchange: "free",
    title: "Rodas de alongamento para pessoas idosas na praça",
    description:
      "Conduzo encontros de alongamento e equilíbrio nas manhãs de sábado, voltados a pessoas acima de sessenta anos. É gratuito e não precisa de inscrição, mas ajuda saber quantos vêm.",
  },
  {
    author: "felipe@exemplo.test",
    category: "moveis-e-utensilios",
    intent: "need",
    resourceType: "item",
    exchange: "trade",
    title: "Procuro estante para peças de bicicleta",
    description:
      "Quero organizar as peças da oficina aberta e preciso de uma estante de metal ou madeira resistente. Em troca, faço uma revisão completa na sua bicicleta.",
  },
];

/** Combinações de troca já concluídas, para o perfil público nascer com histórico. */
const COMPLETED_EXCHANGES = [
  { requester: "carla@exemplo.test", ratingGiven: 5, ratingReceived: 5, daysAgo: 40 },
  { requester: "elisa@exemplo.test", ratingGiven: 4, ratingReceived: 5, daysAgo: 25 },
  { requester: "felipe@exemplo.test", ratingGiven: 5, ratingReceived: 4, daysAgo: 12 },
  { requester: "bruno@exemplo.test", ratingGiven: 3, ratingReceived: null, daysAgo: 2 },
] as const;

const COMMENTS: Record<number, string> = {
  5: "Combinou o horário, chegou pontualmente e ainda ajudou a carregar. Recomendo.",
  4: "Deu tudo certo. Demorou um pouco para responder, mas foi atencioso no encontro.",
  3: "A troca aconteceu, mas remarcamos duas vezes antes de conseguir.",
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

/**
 * Cria conversas com mensagens dos dois lados e as avaliações correspondentes.
 *
 * A última combinação tem avaliação de um lado só e é recente de propósito: é o
 * caso que exercita o prazo às cegas, em que a avaliação existe no banco mas
 * ainda não aparece em nenhum perfil.
 */
async function seedReviews(
  insertedListings: { id: string; authorId: string }[],
  userByEmail: Map<string, string>,
): Promise<number> {
  let created = 0;

  for (const [index, exchange] of COMPLETED_EXCHANGES.entries()) {
    const listing = insertedListings[index + 1];
    const requesterId = userByEmail.get(exchange.requester);
    if (!listing || !requesterId || listing.authorId === requesterId) continue;

    const startedAt = daysAgo(exchange.daysAgo + 3);

    const [conversation] = await db
      .insert(conversations)
      .values({
        listingId: listing.id,
        ownerId: listing.authorId,
        requesterId,
        createdAt: startedAt,
        lastMessageAt: daysAgo(exchange.daysAgo),
      })
      .returning({ id: conversations.id });

    if (!conversation) continue;

    await db.insert(messages).values([
      {
        conversationId: conversation.id,
        senderId: requesterId,
        body: "Oi! Ainda está disponível? Consigo passar aí no fim de semana.",
        createdAt: startedAt,
      },
      {
        conversationId: conversation.id,
        senderId: listing.authorId,
        body: "Oi! Está sim. Pode ser sábado de manhã, na praça em frente ao mercado?",
        createdAt: new Date(startedAt.getTime() + 2 * 3_600_000),
      },
    ]);

    const written = [
      {
        conversationId: conversation.id,
        authorId: requesterId,
        subjectId: listing.authorId,
        rating: exchange.ratingGiven,
        comment: COMMENTS[exchange.ratingGiven] ?? null,
        createdAt: daysAgo(exchange.daysAgo),
      },
    ];

    if (exchange.ratingReceived !== null) {
      written.push({
        conversationId: conversation.id,
        authorId: listing.authorId,
        subjectId: requesterId,
        rating: exchange.ratingReceived,
        comment: COMMENTS[exchange.ratingReceived] ?? null,
        createdAt: daysAgo(exchange.daysAgo),
      });
    }

    await db.insert(reviews).values(written);
    created += written.length;
  }

  return created;
}

/**
 * Conversas recebidas por um mesmo membro, com respostas em ritmos diferentes.
 *
 * Existe para que ao menos um perfil de demonstração ultrapasse o mínimo de
 * conversas e exiba taxa e tempo de resposta — abaixo desse mínimo o perfil
 * deliberadamente não afirma nada, e o demo pareceria quebrado.
 */
async function seedResponseHistory(
  insertedListings: { id: string; authorId: string }[],
  userByEmail: Map<string, string>,
): Promise<void> {
  const first = insertedListings[0];
  if (!first) return;

  // Todas as conversas precisam cair no mesmo dono para somarem no perfil dele;
  // por isso a lista é filtrada por autor em vez de indexada por posição.
  const owned = insertedListings.filter((listing) => listing.authorId === first.authorId);

  const contacts = [
    { email: "carla@exemplo.test", replyAfterHours: 2 },
    { email: "elisa@exemplo.test", replyAfterHours: 20 },
    { email: "felipe@exemplo.test", replyAfterHours: null },
  ] as const;

  for (const [index, contact] of contacts.entries()) {
    const requesterId = userByEmail.get(contact.email);
    const target = owned[index % owned.length];
    if (!requesterId || !target || target.authorId === requesterId) continue;

    const startedAt = daysAgo(20 - index * 4);

    const [conversation] = await db
      .insert(conversations)
      .values({ listingId: target.id, ownerId: target.authorId, requesterId, createdAt: startedAt })
      // A unicidade `(listing_id, requester_id)` pode já ter sido ocupada pelas
      // trocas avaliadas acima; nesse caso esta conversa é simplesmente pulada.
      .onConflictDoNothing({ target: [conversations.listingId, conversations.requesterId] })
      .returning({ id: conversations.id });

    if (!conversation) continue;

    await db.insert(messages).values({
      conversationId: conversation.id,
      senderId: requesterId,
      body: "Oi! Vi seu anúncio e fiquei interessado. Como funciona?",
      createdAt: startedAt,
    });

    if (contact.replyAfterHours !== null) {
      await db.insert(messages).values({
        conversationId: conversation.id,
        senderId: target.authorId,
        body: "Oi! Funciona assim: a gente combina um horário e eu explico tudo pessoalmente.",
        createdAt: new Date(startedAt.getTime() + contact.replyAfterHours * 3_600_000),
      });
    }
  }
}

/**
 * Uma denúncia de anúncio e uma de avaliação, para a fila nascer com conteúdo.
 *
 * Quem denuncia nunca é o autor do alvo: a ação recusaria, e uma linha assim no
 * seed esconderia essa regra de quem for ler.
 */
async function seedReports(
  insertedListings: { id: string; authorId: string }[],
  userByEmail: Map<string, string>,
): Promise<number> {
  const values: (typeof reports.$inferInsert)[] = [];

  const listing = insertedListings.find(
    (item) => item.authorId !== userByEmail.get("diego@exemplo.test"),
  );
  const denunciante = userByEmail.get("diego@exemplo.test");

  if (listing && denunciante) {
    values.push({
      reporterId: denunciante,
      listingId: listing.id,
      reason: "misleading",
      details:
        "A descrição promete entrega em domicílio, mas na conversa a pessoa disse que só entrega mediante pagamento antecipado por transferência.",
    });
  }

  // A avaliação denunciada é escolhida pela autora, e não a primeira que vier:
  // o alvo da denúncia é quem escreveu, e deixar isso ao acaso tornaria a fila
  // de demonstração — e o teste que a exercita — dependente da ordem de
  // inserção.
  const autora = userByEmail.get("carla@exemplo.test");
  const [review] = autora
    ? await db
        .select({ id: reviews.id, authorId: reviews.authorId, subjectId: reviews.subjectId })
        .from(reviews)
        .where(eq(reviews.authorId, autora))
        .limit(1)
    : [];

  if (review) {
    values.push({
      reporterId: review.subjectId,
      reviewId: review.id,
      reason: "other",
      details:
        "A avaliação descreve uma combinação que não foi a nossa: acho que a pessoa confundiu com outro anúncio.",
    });
  }

  if (values.length === 0) return 0;

  await db.insert(reports).values(values);
  return values.length;
}

/**
 * Dá foto de capa aos primeiros anúncios.
 *
 * Grava pelo mesmo caminho que o envio de verdade usa, `putImage`, em vez de
 * inserir uma URL inventada: assim o seed exercita o armazenamento configurado
 * e um `STORAGE_DRIVER` quebrado aparece aqui, não na primeira pessoa que
 * tentar publicar uma foto.
 */
async function seedImages(insertedListings: { id: string }[]): Promise<number> {
  let created = 0;

  for (const [index, listing] of insertedListings.slice(0, 10).entries()) {
    const stored = await putImage(
      new Uint8Array(placeholderPng(index + 1)),
      "image/png",
      `anuncios/${listing.id}`,
    );

    await db.insert(listingImages).values({
      listingId: listing.id,
      url: stored.url,
      storageKey: stored.key,
      alt: "Imagem de demonstração",
      sortOrder: 0,
    });

    created += 1;
  }

  return created;
}

async function main() {
  console.warn("Limpando dados de domínio...");
  await db.execute(sql`
    TRUNCATE TABLE reports, moderators, reviews, messages, conversations, favorites, listing_images, listings,
      profiles, categories, session, account, "user" RESTART IDENTITY CASCADE
  `);

  console.warn("Inserindo categorias...");
  const insertedCategories = await db
    .insert(categories)
    .values(CATEGORIES.map((category, index) => ({ ...category, sortOrder: index })))
    .returning({ id: categories.id, slug: categories.slug });

  const categoryBySlug = new Map(insertedCategories.map((c) => [c.slug, c.id]));

  console.warn("Criando contas de demonstração...");
  const userByEmail = new Map<string, string>();

  for (const person of PEOPLE) {
    const created = await auth.api.signUpEmail({
      body: { name: person.name, email: person.email, password: SEED_PASSWORD },
    });
    userByEmail.set(person.email, created.user.id);

    // O Better Auth carimba `created_at` com a data de hoje. Sem envelhecer as
    // contas, o perfil de demonstração exibiria "Novo por aqui" ao lado de
    // avaliações de meses atrás.
    await db
      .update(user)
      .set({ createdAt: daysAgo(180) })
      .where(eq(user.id, created.user.id));

    await db.insert(profiles).values({
      userId: created.user.id,
      headline: person.headline,
      city: person.city,
      state: person.state,
      latitude: person.latitude,
      longitude: person.longitude,
    });
  }

  for (const member of STAFF) {
    const staffId = userByEmail.get(member.email);
    if (staffId) await db.insert(moderators).values({ userId: staffId, role: member.role });
  }

  console.warn("Inserindo anúncios...");
  const locationByEmail = new Map(PEOPLE.map((p) => [p.email, p]));

  const insertedListings = await db
    .insert(listings)
    .values(
      LISTINGS.map((listing) => {
        const author = locationByEmail.get(listing.author);
        const authorId = userByEmail.get(listing.author);
        const categoryId = categoryBySlug.get(listing.category);
        if (!author || !authorId || !categoryId) {
          throw new Error(`Dados de seed inconsistentes para ${listing.title}`);
        }

        return {
          authorId,
          categoryId,
          slug: slugify(listing.title),
          intent: listing.intent,
          resourceType: listing.resourceType,
          exchange: listing.exchange,
          priceCents: listing.priceCents ?? null,
          title: listing.title,
          description: listing.description,
          city: author.city,
          state: author.state,
          // Um deslocamento pequeno evita que todos os anúncios de uma pessoa
          // caiam exatamente no mesmo ponto do mapa.
          latitude: author.latitude + (Math.random() - 0.5) * 0.04,
          longitude: author.longitude + (Math.random() - 0.5) * 0.04,
        };
      }),
    )
    .returning({ id: listings.id, authorId: listings.authorId });

  console.warn("Criando uma conversa de exemplo...");
  const target = insertedListings[0];
  const requesterId = userByEmail.get("diego@exemplo.test");

  if (target && requesterId && target.authorId !== requesterId) {
    const [conversation] = await db
      .insert(conversations)
      .values({ listingId: target.id, ownerId: target.authorId, requesterId })
      .returning({ id: conversations.id });

    if (conversation) {
      await db.insert(messages).values([
        {
          conversationId: conversation.id,
          senderId: requesterId,
          body: "Oi! Tenho dois sobrinhos no 7º ano que precisariam muito. Ainda há vaga na turma?",
        },
        {
          conversationId: conversation.id,
          senderId: target.authorId,
          body: "Oi, Diego! Tenho sim, ainda restam duas vagas nas terças. Consegue às 19h?",
        },
      ]);
    }
  }

  console.warn("Criando trocas concluídas e avaliações...");
  const reviewed = await seedReviews(insertedListings, userByEmail);
  await seedResponseHistory(insertedListings, userByEmail);

  console.warn("Gerando imagens de demonstração...");
  const imagens = await seedImages(insertedListings);

  console.warn("Abrindo a fila de moderação...");
  const denuncias = await seedReports(insertedListings, userByEmail);

  console.warn(
    `Pronto: ${insertedCategories.length} categorias, ${PEOPLE.length} contas, ${insertedListings.length} anúncios, ${imagens} imagens, ${reviewed} avaliações e ${denuncias} denúncias.`,
  );
  console.warn(`Entre com qualquer e-mail acima e a senha: ${SEED_PASSWORD}`);
  console.warn(`A fila de moderação fica em /painel/denuncias, com ${MODERATOR_EMAIL}.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Falha ao popular o banco:", error);
    process.exit(1);
  });
