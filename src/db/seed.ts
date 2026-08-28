import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { db } from "./index";
import { categories, conversations, listings, messages, profiles } from "./schema";

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
];

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

async function main() {
  console.warn("Limpando dados de domínio...");
  await db.execute(sql`
    TRUNCATE TABLE messages, conversations, favorites, listing_images, listings,
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

    await db.insert(profiles).values({
      userId: created.user.id,
      headline: person.headline,
      city: person.city,
      state: person.state,
      latitude: person.latitude,
      longitude: person.longitude,
    });
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

  console.warn(
    `Pronto: ${insertedCategories.length} categorias, ${PEOPLE.length} contas e ${insertedListings.length} anúncios.`,
  );
  console.warn(`Entre com qualquer e-mail acima e a senha: ${SEED_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Falha ao popular o banco:", error);
    process.exit(1);
  });
