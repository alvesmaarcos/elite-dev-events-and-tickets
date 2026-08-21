# Decisões de projeto


## Back-End
NodeJS com TypeScript.
Porquê: Inicialmente idealizei com JS, mas foi extremamente importante a troca, ainda na idealização, para TypeScript, pelos benefícios de se utilizar de uma linguagem fortemente tipada e compilada, pois tornou o ambiente em execução muito mais seguro a falhas. Além disso, a ORM Prisma tem maior integração com TS.


## Framework do back-end
Express
Porquê: Maior familiaridade, devido a projetos acadêmicos anteriores.


## API Externa
TMDb
Porquê: O processo da Ticketmaster era verboso e a aprovação do cadastro teria um custo de tempo que o prazo de 7 dias não me permitiria arriscar. TMDb liberava uma APIKEY instantâneamente após o cadastro. Além disso, a documentação do TMDb me pareceu menos complexa de aprender e pesquisar.


## Fluxo de reserva de ingresso
Dentre as opções, mapa de assentos e quantidade de ingressos, escolhi mapa de assentos.
Me baseei também em um aplicativo de cinema local, no qual é possível escolher dinamicamente a quantidade de ingressos escolhida, de forma que basta selecionar as poltronas e o valor será somado automaticamente.

## Banco de Dados
PostgreSQL
Porquê: É relacional e possuo bastante familiaridade e confiança para utilizá-lo. Fácil de orquestrar utilizando Docker.
- Mapeamento: Prisma ORM, devido à praticidade.

## Organização do repositório
Monorepo com npm workspaces.
Apesar do desafio não ter mencionado este quesito, achei importante mencionar qual a organização das pastas que escolhi seguir. Aqui o objetivo foi evitar complexidade organizacional, devido à natureza do projeto.

## Simulação de pagamentos
Por fins testáveis, a simulação de recusa e aceite dos pagamentos dos ingressos foi feita simplesmente por dois botões de "aceitar pagamento" e "recusar" na seção de compra de assentos.

## Fluxo de verificação de QR Code
A portaria acessa a seção da aplicação dedicada à sua área e escaneia o QR Code que o cliente gerou a partir da seção "Meus ingressos" no perfil.
