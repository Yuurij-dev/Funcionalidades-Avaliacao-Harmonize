# Harmonize — Atrament + Formas (v2)

Projeto independente em **React 19, Vite, TypeScript e Atrament**, focado no tablet e caneta digital, para fazer marcações sobre fotos durante a avaliação estética.

**Não usa tldraw.** O Atrament (MIT) faz o desenho livre sobre um canvas transparente; o editor adiciona uma camada SVG com formas vetoriais para seleção, arraste, redimensionamento e exportação.

## Executar

Requer Node 20.19+ ou 22+.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

Para testar no **tablet**, conecte computador e tablet na mesma rede Wi-Fi. No Windows, rode `ipconfig` para ver o endereço IPv4 do computador e acesse no tablet `http://SEU-IP:5173`. Libere acesso no firewall se necessário.

## Ferramentas

- **Caneta livre**: Atrament, suavização, pressão conforme dispositivo, espessura e cores.
- **Borracha**: apaga tinta livre do Atrament (formas são excluídas pelo botão de lixeira após selecionar).
- **Formas**: círculo/elipse, retângulo, linha, seta e triângulo. Toque/arraste com caneta, dedo ou mouse para desenhar.
- **Seleção**: toque na forma, arraste para movê-la e arraste as alças claras para redimensionar. Com a seleção ativa, altere cor e espessura; botão X exclui a forma.
- **Desfazer/refazer**: histórico único com até 80 ações recentes de tinta, formas e edição.
- **Limpar**: apaga desenhos e formas em uma operação reversível.
- **Salvar PNG**: exporta **foto + tinta livre + formas** sem bordas de seleção.
- **Tela cheia**: use o botão para dedicar mais espaço à foto no tablet.
- **Somente caneta ativa**: ignora ponteiros de toque durante o desenho; depende de o navegador identificar `pointerType='pen'`.
- **Imagem exemplo** inclusa; também aceita JPEG/PNG/WebP/AVIF até 15 MB.

### Limitações

- Este projeto é um **protótipo local**; não armazena dados entre recargas da página e não implementa autenticação ou uploads para backend. Exporte a imagem antes de sair.
- Sensibilidade de pressão e identificação da caneta dependem de navegador, dispositivo e caneta. Canetas capacitivas passivas podem se identificar como toque.
- As formas são uma camada SVG criada neste protótipo, **não uma funcionalidade nativa do Atrament**.
- As marcações ficam alinhadas à foto ao redimensionar a janela, mas não há gesto de pinça/zoom no editor desta versão.
- SVG e Atrament compartilham coordenadas sobre a foto; exportação preserva cores, posições e espessuras aproximadas na resolução da imagem.

## Uso comercial e licença

Atrament é disponibilizado sob **licença MIT**: pode ser utilizado comercialmente sem pagamento de licença, desde que mantidos os avisos e condições da licença. Confira o texto integral no pacote do Atrament instalado via npm e em https://github.com/jakubfiala/atrament/blob/main/LICENSE.md. Este protótipo não inclui código do tldraw.

Fotos reais de pacientes exigem medidas adicionais de privacidade, segurança, autorização, autenticação e conformidade com a legislação aplicável antes de implantar no Harmonize.
