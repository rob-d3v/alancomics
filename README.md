Alan Comics - Visualizador de Imagens Responsivo

## Sobre o Projeto

Alan Comics é um visualizador de imagens moderno, intuitivo e totalmente responsivo, desenvolvido para leitura de quadrinhos, mangás, e coleções de imagens. A aplicação oferece uma experiência de leitura fluida tanto em desktops quanto em dispositivos móveis.

### Recursos Principais

- **Visualização Flexível**: Modo de leitura vertical ou horizontal
- **Rolagem Automática**: Configuração de velocidade de rolagem ajustável
- **Gerenciamento de Imagens**: Upload, armazenamento e organização de imagens
- **Zoom Intuitivo**: Controles de zoom avançados com suporte a gestos pinch-to-zoom
- **Temas Personalizáveis**: Quatro temas visuais (Claro, Escuro, Comics, Neon)
- **Totalmente Responsivo**: Experiência otimizada para desktop, tablet e smartphone
- **Armazenamento Local**: Imagens salvas no dispositivo usando IndexedDB
- **Modo Tela Cheia**: Experiência imersiva em tela completa
- **Suporte a Gestos**: Navegação intuitiva em dispositivos de toque

## Tecnologias Utilizadas

- HTML5 / CSS3 / JavaScript
- IndexedDB para armazenamento de imagens
- Web Storage API
- Técnicas CSS modernas (Grid, Flexbox, Variables)
- Responsividade para todos os dispositivos
- Eventos de toque para dispositivos móveis

## Instalação & Execução

1. Clone o repositório:
   ```bash
   git clone https://github.com/robd3v/alancomics.git
   ```

2. Navegue até a pasta do projeto:
   ```bash
   cd alan-comics
   ```

3. Abra o arquivo `index.html` em seu navegador preferido.

### Usando um servidor local

Para uma experiência completa, recomendamos executar a aplicação em um servidor local:

```bash
# Usando Python 2
python -m SimpleHTTPServer 8000

# Usando Python 3
python -m http.server 8000

# Usando Node.js (com http-server instalado)
npx http-server
```

Em seguida, acesse `http://localhost:8000` em seu navegador.

## Uso da Aplicação

### Upload de Imagens

1. Clique no botão "Escolher Arquivos" ou arraste arquivos para a área de upload
2. Em dispositivos móveis, use a câmera para capturar novas imagens

### Navegação

- Use os botões de rolagem vertical/horizontal para alterar o modo de visualização
- Ajuste a velocidade de rolagem usando o controle deslizante
- Utilize os botões de seta para navegar manualmente
- Ative o modo de rolagem automática com o botão "Iniciar Rolagem Automática"

### Visualização de Imagens

- Ajuste o zoom com os botões + e - ou usando gestos de pinch em dispositivos de toque
- Defina o espaçamento entre imagens com o controle deslizante
- Alterne entre temas clicando nas opções de cor no cabeçalho
- Use o modo tela cheia para uma experiência imersiva

### Personalização

- Selecione entre quatro temas: Claro, Escuro, Comics e Neon
- Ajuste o espaçamento entre imagens de -30px a 100px
- Configure a velocidade de rolagem de 0.1 a 10

## Funcionalidades Responsivas

A aplicação é totalmente otimizada para dispositivos móveis, incluindo:

- Layout adaptativo para telas de diferentes tamanhos
- Interface touch-friendly com botões maiores em dispositivos móveis
- Sidebar posicionada na parte inferior em telas pequenas
- Gestos de pinch para zoom e swipe para navegação
- Otimização de performance para dispositivos menos potentes
- Suporte a orientação retrato e paisagem

## Suporte de Navegadores

- Chrome (recomendado)
- Firefox
- Safari
- Edge

## Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um Fork do projeto
2. Crie sua Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Roadmap

Recursos planejados para futuras versões:

- [ ] Marcadores para continuar a leitura de onde parou
- [ ] Suporte para arquivos ZIP/CBZ
- [ ] Sincronização entre dispositivos via cloud
- [ ] Modo de leitura página dupla
- [ ] Detecção automática de modo manga (direita para esquerda)
- [ ] Melhoria na detecção de páginas coloridas vs. preto e branco

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE.md](LICENSE.md) para detalhes.

## Contato

Seu Nome - [@robd3v](https://instagram.com/robd3v) - robs.eng@outlook.com

Link do Projeto: [https://github.com/robd3v/alancomics](https://github.com/robd3v/alancomics)
