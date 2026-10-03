// Catálogo de categorias e temas, com foco no retrô brasileiro.
// Cada dia, cada categoria sorteia um tema.
// `q` = busca no Openverse (Flickr etc.), `wq` = busca no Wikimedia Commons.
// Buscas em português trazem fotos de brasileiros, com títulos em português.

export type Theme = {
  slug: string;
  title: string;
  q: string;
  wq: string;
  intro: string;
  /** tema 100% brasileiro (todas as fotos contam como "Só Brasil") */
  br?: boolean;
};

export type Category = {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  /** busca extra no Wikimedia só com coisas do Brasil, para o filtro "Só Brasil" */
  bq?: string;
  /** categorias do Wikimedia Commons de onde o "descobridor" tira temas novos todo dia */
  roots: string[];
  themes: Theme[];
};

export const CATEGORIES: Category[] = [
  {
    slug: "brasil",
    roots: ["Photographs by Augusto Malta", "Photographs by Marc Ferrez", "Rio de Janeiro in the 1950s", "Rio de Janeiro in the 1960s", "São Paulo in the 1950s", "Brazil in the 1970s", "Trams in Brazil"],
    name: "Brasil Antigo",
    emoji: "🇧🇷",
    color: "#3ddc84",
    themes: [
      { slug: "rio-malta", title: "Rio de Janeiro antigo", q: "rio de janeiro antigo", wq: "Augusto Malta Rio de Janeiro rua", intro: "O Rio de bondes, chapéus e calçadão novinho, pelas lentes de Augusto Malta.", br: true },
      { slug: "rio-ferrez", title: "Brasil de Marc Ferrez", q: "fotografia antiga brasil", wq: "Marc Ferrez fotografia Rio de Janeiro paisagem", intro: "O fotógrafo que registrou o Brasil do século XIX como ninguém.", br: true },
      { slug: "sp-antiga", title: "São Paulo antiga", q: "são paulo antigo", wq: "Guilherme Gaensly São Paulo", intro: "Quando a Paulista tinha casarão e o centro tinha bonde.", br: true },
      { slug: "bondes", title: "Bondes", q: "bonde antigo", wq: "bonde elétrico Rio de Janeiro", intro: "Pendurado no estribo, pagando o condutor no grito.", br: true },
      { slug: "orelhao", title: "Orelhão", q: "orelhão", wq: "orelhão telefone público", intro: "Ficha telefônica no bolso e fila para ligar.", br: true },
      { slug: "fachadas", title: "Fachadas e armazéns", q: "armazém antigo", wq: "fachada antiga armazém Brasil", intro: "Secos e molhados, fiado na caderneta e balcão de madeira." },
      { slug: "copacabana", title: "Copacabana antiga", q: "copacabana antiga", wq: "Copacabana 1950s praia", intro: "Calçadão de ondas, Copacabana Palace e areia lotada no domingo." },
      { slug: "carnaval", title: "Carnaval antigo", q: "carnaval antigo", wq: "carnaval Rio de Janeiro 1950s", intro: "Confete, serpentina, lança-perfume proibido e marchinha no salão." },
      { slug: "futebol", title: "Futebol de antigamente", q: "futebol antigo", wq: "futebol Brasil 1970 estádio", intro: "Chuteira de couro, bola pesada e radinho no ouvido da arquibancada." },
      { slug: "estacoes", title: "Estações de trem", q: "estação ferroviária antiga", wq: "estação ferroviária Brasil antiga", intro: "Apito do trem, plataforma cheia e malas de couro." },
      { slug: "postais", title: "Cartões-postais antigos", q: "cartão postal antigo", wq: "cartão postal Brasil antigo", intro: "Lembrança de viagem mandada pelo correio, com selo e carimbo." },
      { slug: "mercados", title: "Feiras e mercados", q: "mercado municipal antigo", wq: "mercado municipal Brasil fotografia antiga", intro: "Pastel de feira, balança de ponteiro e grito de xepa." },
    ],
  },
  {
    slug: "carros",
    roots: ["Automobiles in Brazil", "1950s automobiles", "1960s automobiles", "1970s automobiles"],
    bq: "automóvel antigo Brasil",
    name: "Carros & Motocas",
    emoji: "🚗",
    color: "#2fd6ff",
    themes: [
      { slug: "fusca", title: "Fusca", q: "fusca", wq: "Volkswagen Fusca", intro: "O carro que todo brasileiro já empurrou pelo menos uma vez." },
      { slug: "kombi", title: "Kombi", q: "kombi", wq: "Volkswagen Kombi", intro: "Lotação, pastelaria, mudança e prancha no rack." },
      { slug: "opala", title: "Opala", q: "opala chevrolet", wq: "Chevrolet Opala", intro: "Seis cilindros, banco inteiriço e ronco de respeito." },
      { slug: "brasilia", title: "Brasília", q: "volkswagen brasilia", wq: "Volkswagen Brasília", intro: "A amarela mais famosa das garagens brasileiras." },
      { slug: "chevette", title: "Chevette", q: "chevette", wq: "Chevrolet Chevette", intro: "O primeiro carro de meio Brasil." },
      { slug: "lambreta", title: "Lambretas e Vespas", q: "lambretta", wq: "Lambretta", intro: "Capacete coquinho e garupa na avenida." },
      { slug: "gurgel", title: "Gurgel", q: "gurgel", wq: "Gurgel", intro: "O carro 100% brasileiro do João Gurgel." },
      { slug: "maverick", title: "Maverick", q: "maverick ford", wq: "Ford Maverick", intro: "V8, faixa no capô e cheiro de gasolina." },
      { slug: "puma", title: "Puma", q: "puma gt", wq: "Puma GTE", intro: "O esportivo de fibra que fazia o Brasil sonhar." },
      { slug: "caminhoes", title: "Caminhões antigos", q: "caminhão antigo", wq: "vintage trucks", intro: "Para-choque com frase, cabine arredondada e estrada sem fim." },
      { slug: "onibus", title: "Ônibus antigos", q: "ônibus antigo", wq: "ônibus antigo Brasil", intro: "Catraca, cobrador e janela que não fechava." },
      { slug: "classicos50", title: "Clássicos dos anos 50", q: "classic car 1950s", wq: "1950s automobiles", intro: "Cromo, rabo de peixe e pintura de duas cores." },
    ],
  },
  {
    slug: "games",
    roots: ["Arcade games", "Handheld game consoles", "Home computers"],
    bq: "fliperama Brasil",
    name: "Games & Fliperama",
    emoji: "🕹️",
    color: "#ff3fa4",
    themes: [
      { slug: "fliperama", title: "Fliperamas", q: "fliperama", wq: "arcade cabinet", intro: "Ficha na mão e fila atrás: o fliperama era a rede social da época." },
      { slug: "master", title: "Master System", q: "master system", wq: "Sega Master System", intro: "Alex Kidd na memória e Tectoy na caixa." },
      { slug: "megadrive", title: "Mega Drive", q: "mega drive sega", wq: "Sega Mega Drive", intro: "16 bits de pura emoção — e um Sonic na tela." },
      { slug: "atari", title: "Atari", q: "atari 2600", wq: "Atari 2600", intro: "Joystick de um botão só e imaginação de sobra." },
      { slug: "gameboy", title: "Game Boy & portáteis", q: "game boy", wq: "Game Boy", intro: "Tela verde, quatro pilhas e Tetris no banco de trás." },
      { slug: "pinball", title: "Pinball", q: "pinball", wq: "pinball machine", intro: "Luzes, molas e o eterno pavor do TILT." },
      { slug: "snes", title: "Super Nintendo", q: "super nintendo", wq: "Super Nintendo Entertainment System", intro: "Assopra o cartucho e torce para pegar de primeira." },
      { slug: "nes", title: "Nintendinho", q: "nintendo nes", wq: "Nintendo Entertainment System", intro: "O cinza mais famoso da sala de estar." },
      { slug: "ps1", title: "PlayStation 1", q: "playstation 1", wq: "PlayStation (console)", intro: "CD de demonstração e memory card de 15 blocos." },
      { slug: "gamewatch", title: "Minigames de bolso", q: "game and watch", wq: "Game & Watch", intro: "Uma tela, um jogo e pilha de relógio." },
      { slug: "tamagotchi", title: "Tamagotchi", q: "tamagotchi", wq: "Tamagotchi", intro: "O bichinho virtual que morria na aula de matemática." },
      { slug: "lan", title: "Lan houses", q: "lan house", wq: "LAN party", intro: "Counter-Strike, fone emprestado e R$ 1 a hora." },
    ],
  },
  {
    slug: "musica",
    roots: ["Gramophone records", "Jukeboxes", "Radio receivers"],
    bq: "disco de vinil brasileiro",
    name: "Som & Música",
    emoji: "📼",
    color: "#ffb321",
    themes: [
      { slug: "vinil", title: "Discos de vinil", q: "disco de vinil", wq: "disco de vinil", intro: "Lado A, lado B e o chiadinho que nenhum streaming imita." },
      { slug: "cassete", title: "Fitas cassete", q: "fita cassete", wq: "compact cassette", intro: "Caneta Bic para rebobinar: tecnologia de ponta." },
      { slug: "radio", title: "Rádio antigo", q: "rádio antigo", wq: "rádio antigo válvula", intro: "A família reunida em volta do rádio esperando a novela." },
      { slug: "vitrola", title: "Vitrolas e toca-discos", q: "toca-discos", wq: "phonograph", intro: "Agulha no disco e domingo na sala." },
      { slug: "jukebox", title: "Jukebox", q: "jukebox", wq: "jukebox", intro: "Uma moeda, uma música e o bar inteiro cantando junto." },
      { slug: "walkman", title: "Walkman", q: "walkman", wq: "Walkman", intro: "A trilha sonora da vida cabia no bolso da jaqueta." },
      { slug: "tocafitas", title: "Toca-fitas de carro", q: "toca fitas carro", wq: "car cassette player", intro: "Auto-reverse e a fita da viagem rodando sem parar." },
      { slug: "discman", title: "Discman", q: "discman", wq: "Discman", intro: "Anti-skip ligado e mesmo assim pulava na lombada." },
      { slug: "guitarras", title: "Guitarras e bandas", q: "guitarra antiga", wq: "vintage guitar", intro: "Garagem, amplificador valvulado e vizinho reclamando." },
      { slug: "capas", title: "Capas de disco", q: "capa de disco antiga", wq: "album cover 1960s", intro: "Arte de LP que virava quadro na parede." },
      { slug: "microfones", title: "Microfones antigos", q: "vintage microphone", wq: "vintage microphone", intro: "O microfone de rádio que fez história." },
      { slug: "radinho", title: "Radinho de pilha", q: "radinho de pilha", wq: "transistor radio", intro: "Jogo de domingo colado no ouvido." },
    ],
  },
  {
    slug: "tech",
    roots: ["Typewriters", "Telephones", "Television sets", "Calculators"],
    bq: "telefone antigo museu Brasil",
    name: "Tecnologia de Antigamente",
    emoji: "📞",
    color: "#7cff6b",
    themes: [
      { slug: "telefone", title: "Telefones antigos", q: "telefone antigo", wq: "telefone antigo", intro: "Discar o número errado levava uns bons 20 segundos." },
      { slug: "maquina", title: "Máquinas de escrever", q: "máquina de escrever", wq: "máquina de escrever", intro: "Plim! no fim da linha e corretivo no erro." },
      { slug: "tv", title: "TV de tubo", q: "televisão antiga", wq: "vintage television set", intro: "Bombril na antena e tapa do lado para sintonizar." },
      { slug: "computador", title: "Computadores antigos", q: "computador antigo", wq: "vintage computers", intro: "Tela de fósforo verde e barulho de internet discada." },
      { slug: "disquete", title: "Disquetes", q: "disquete", wq: "floppy disk", intro: "1,44 MB de pura esperança." },
      { slug: "camera", title: "Câmeras de filme", q: "câmera antiga", wq: "film camera", intro: "36 poses e nenhuma chance de ver antes de revelar." },
      { slug: "videocassete", title: "Videocassete", q: "videocassete", wq: "videocassette recorder", intro: "Programar para gravar a novela era coisa de engenheiro." },
      { slug: "celulares", title: "Celulares antigos", q: "celular antigo", wq: "Nokia 3310", intro: "Jogo da cobrinha e bateria que durava uma semana." },
      { slug: "calculadoras", title: "Calculadoras antigas", q: "calculadora antiga", wq: "vintage calculator", intro: "Visor verde e a palavra de cabeça para baixo." },
      { slug: "relogios", title: "Relógios digitais", q: "relógio digital antigo", wq: "digital watch 1980s", intro: "Alarme apitando na hora certa, em todo lugar ao mesmo tempo." },
      { slug: "slides", title: "Projetor de slides", q: "projetor de slides", wq: "slide projector", intro: "Sessão de fotos da viagem na parede da sala." },
      { slug: "eletro", title: "Eletrodomésticos antigos", q: "eletrodoméstico antigo", wq: "vintage home appliance", intro: "Liquidificador de vidro grosso e geladeira que durava 40 anos." },
    ],
  },
  {
    slug: "moda",
    roots: ["1950s fashion", "1960s fashion", "1970s fashion", "1980s fashion", "Hats"],
    bq: "moda Brasil década",
    name: "Moda & Estilo",
    emoji: "🕶️",
    color: "#c78bff",
    themes: [
      { slug: "moda50", title: "Moda dos anos 50", q: "1950s fashion", wq: "1950s fashion", intro: "Saia rodada, topete e brilhantina." },
      { slug: "moda60", title: "Moda dos anos 60", q: "1960s fashion", wq: "1960s fashion", intro: "Minissaia, iê-iê-iê e cabelo armado." },
      { slug: "moda70", title: "Moda dos anos 70", q: "1970s fashion", wq: "1970s fashion", intro: "Boca de sino, gola gigante e muito marrom." },
      { slug: "moda80", title: "Moda dos anos 80", q: "1980s fashion", wq: "1980s fashion", intro: "Ombreira, neon e cabelo com laquê até o teto." },
      { slug: "patins", title: "Patins e discoteca", q: "roller skates retro", wq: "roller skates", intro: "Rinque, globo espelhado e a música do momento." },
      { slug: "pinup", title: "Pin-ups", q: "pin-up vintage", wq: "pin-up art 1940s", intro: "Batom vermelho, lenço no cabelo e pose de calendário." },
      { slug: "praia", title: "Praia retrô", q: "vintage beach", wq: "Copacabana 1950s", intro: "Maiô de bolinha, guarda-sol listrado e mate gelado." },
      { slug: "oculos", title: "Óculos retrô", q: "óculos antigos", wq: "vintage eyeglasses", intro: "Armação de tartaruga e lente fundo de garrafa." },
      { slug: "chapeus", title: "Chapéus", q: "chapéu antigo", wq: "1950s hats", intro: "Ninguém saía de casa sem chapéu." },
      { slug: "tenis", title: "Tênis antigos", q: "tênis antigo", wq: "vintage sneakers", intro: "Kichute, Conga e o cadarço amarrado na canela." },
      { slug: "bailes", title: "Bailes e festas", q: "baile antigo", wq: "1950s dance", intro: "Bailinho de garagem, ponche e música lenta." },
      { slug: "penteados", title: "Penteados retrô", q: "penteado anos 60", wq: "1960s hairstyles", intro: "Bobes na cabeça e paciência infinita." },
      { slug: "uniformes", title: "Uniformes escolares", q: "uniforme escolar antigo", wq: "school uniform 1950s", intro: "Meião branco, gravatinha e merendeira de lata." },
    ],
  },
  {
    slug: "propaganda",
    roots: ["Advertisements", "Neon signs", "Packaging", "Enamel signs"],
    bq: "anúncio antigo revista Brasil",
    name: "Propaganda & Design",
    emoji: "🎨",
    color: "#ff6b3d",
    themes: [
      { slug: "propaganda", title: "Propagandas antigas", q: "propaganda antiga", wq: "propaganda antiga revista", intro: "Quando o anúncio prometia o futuro numa geladeira." },
      { slug: "rotulos", title: "Rótulos e embalagens", q: "embalagem antiga", wq: "rótulo antigo", intro: "Lata de biscoito que virava caixa de costura." },
      { slug: "neon", title: "Letreiros neon", q: "letreiro neon", wq: "neon signs", intro: "Zumbido elétrico e uma letra sempre queimada." },
      { slug: "cartazes", title: "Cartazes de viagem", q: "vintage travel poster", wq: "travel posters", intro: "Destinos exóticos em litografia colorida." },
      { slug: "lanchonete", title: "Lanchonetes retrô", q: "retro diner", wq: "diner", intro: "Milk-shake, banco giratório e piso xadrez." },
      { slug: "modernismo", title: "Arquitetura anos 50", q: "mid century modern", wq: "Oscar Niemeyer 1950s", intro: "Curvas, pilotis e azulejo de Athos Bulcão." },
      { slug: "garrafas", title: "Garrafas de refrigerante", q: "garrafa de refrigerante antiga", wq: "vintage soda bottle", intro: "Garrafa de vidro retornável e tampinha para colecionar." },
      { slug: "latas", title: "Latas antigas", q: "lata antiga", wq: "vintage tin can", intro: "Lata de biscoito, de talco, de goiabada: tudo virava porta-trecos." },
      { slug: "circo", title: "Cartazes de circo", q: "cartaz de circo", wq: "circus poster", intro: "Respeitável público! O maior espetáculo da Terra." },
      { slug: "placas", title: "Placas esmaltadas", q: "placa esmaltada", wq: "enamel sign", intro: "Propaganda pregada na parede do boteco." },
      { slug: "venda", title: "Máquinas de venda", q: "vending machine vintage", wq: "vintage vending machine", intro: "Moeda na fenda e o refrigerante caindo lá embaixo." },
      { slug: "pintados", title: "Letreiros pintados", q: "letreiro pintado à mão", wq: "ghost sign", intro: "Arte de letrista em fachada de comércio." },
    ],
  },
  {
    slug: "brinquedos",
    roots: ["Toys", "Dolls", "Board games"],
    bq: "brinquedo antigo museu Brasil",
    name: "Brinquedos & Gibis",
    emoji: "🧸",
    color: "#ffe14d",
    themes: [
      { slug: "brinquedos", title: "Brinquedos antigos", q: "brinquedos antigos", wq: "brinquedo antigo", intro: "Pilha vendida separadamente." },
      { slug: "robos", title: "Robôs de lata", q: "tin toy robot", wq: "tin toy robot", intro: "Corda nas costas e faísca no peito." },
      { slug: "gibis", title: "Gibis e quadrinhos", q: "gibi antigo", wq: "Golden Age comic book covers", intro: "Banca de jornal, troca-troca e figurinha repetida." },
      { slug: "pulp", title: "Revistas pulp", q: "pulp magazine cover", wq: "pulp magazine covers", intro: "Foguetes, monstros e capas escandalosas." },
      { slug: "tabuleiro", title: "Jogos de tabuleiro", q: "jogo de tabuleiro antigo", wq: "board games", intro: "Dado perdido debaixo do sofá desde 1987." },
      { slug: "carrinhos", title: "Carrinhos de ferro", q: "carrinho de ferro", wq: "die-cast toy", intro: "Coleção alinhada na estante, nunca tirada da caixa." },
      { slug: "bonecas", title: "Bonecas antigas", q: "boneca antiga", wq: "antique doll", intro: "Bonecas de louça e de pano, guardadas na cristaleira." },
      { slug: "gude", title: "Bolinha de gude e pião", q: "bolinha de gude", wq: "marbles toy", intro: "Jogar na terra, búlica, e o pião rodando na unha." },
      { slug: "figurinhas", title: "Álbuns de figurinhas", q: "álbum de figurinhas", wq: "sticker album", intro: "Bafo, troca no recreio e a figurinha difícil que nunca vinha." },
      { slug: "trens", title: "Trenzinhos", q: "trem de brinquedo", wq: "toy train", intro: "Trilho montado na sala no Natal." },
      { slug: "bicicletas", title: "Bicicletas antigas", q: "bicicleta antiga", wq: "vintage bicycle", intro: "Monark, Caloi e joelho ralado." },
      { slug: "cubo", title: "Cubo mágico", q: "cubo mágico", wq: "Rubik's Cube", intro: "Ninguém resolvia; todo mundo descolava os adesivos." },
    ],
  },
  {
    slug: "cine",
    roots: ["Film posters", "Animation", "Cinemas in Brazil"],
    bq: "cinema antigo Rio de Janeiro",
    name: "Cinema & TV",
    emoji: "📺",
    color: "#4d7cff",
    themes: [
      { slug: "vhs", title: "Fitas VHS", q: "fita vhs", wq: "VHS", intro: "Seja gentil, rebobine — senão a locadora cobra multa." },
      { slug: "cinemas", title: "Cinemas de rua", q: "cinema antigo", wq: "cinema antigo Brasil", intro: "Letreiro na marquise e lanterninha no corredor." },
      { slug: "cartazes-filme", title: "Cartazes de filme", q: "vintage movie poster", wq: "film posters 1950s", intro: "Pintados à mão, cheios de exclamações." },
      { slug: "driveins", title: "Cinemas drive-in", q: "drive-in theater", wq: "drive-in theaters", intro: "Filme na tela gigante e alto-falante pendurado na janela." },
      { slug: "projetores", title: "Projetores", q: "projetor de filme", wq: "movie projector", intro: "O tec-tec-tec do rolo girando no escuro." },
      { slug: "espacial", title: "Era Espacial", q: "1960s space age", wq: "Project Apollo", intro: "Quando o futuro tinha antena e capacete de bolha." },
      { slug: "locadoras", title: "Locadoras de vídeo", q: "locadora de vídeo", wq: "video rental store", intro: "Sexta à noite escolhendo filme na prateleira de lançamentos." },
      { slug: "super8", title: "Câmeras Super 8", q: "câmera de filmar antiga", wq: "Super 8 camera", intro: "Filmes de família sem som e com muito granulado." },
      { slug: "terror", title: "Terror de antigamente", q: "horror movie poster vintage", wq: "horror film posters 1950s", intro: "Monstro de borracha e grito de cinema." },
      { slug: "desenhos", title: "Desenhos animados antigos", q: "vintage cartoon", wq: "animation cel", intro: "Sábado de manhã, pijama e TV ligada." },
      { slug: "radionovela", title: "Estúdios de rádio", q: "estúdio de rádio antigo", wq: "radio studio 1940s", intro: "Novela no rádio e sonoplastia com casca de coco." },
      { slug: "ingressos", title: "Ingressos e bilheterias", q: "ingresso de cinema antigo", wq: "cinema ticket vintage", intro: "Fila na bilheteria e ingresso de papel picotado." },
    ],
  },
];

export const CATEGORY_BY_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]));
