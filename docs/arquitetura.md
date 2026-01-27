app/src/
├── app/
│   ├── core/
│   │   ├── models/         # Modelos de dados (Demand, Task, User)
│   │   ├── services/       # Firebase, Auth, Demand Services
│   │   ├── guards/         # Auth Guards para rotas protegidas
│   │   └── index.ts        # Barrel export
│   ├── components/
│   │   ├── header/         # Cabeçalho com info do usuário
│   │   ├── demand-card/    # Card de demanda com tarefas
│   │   ├── demand-modal/   # Modal criar/editar demanda
│   │   └── custom-field-modal/  # Modal campos customizáveis
│   ├── pages/
│   │   ├── login/          # Página de login com Google
│   │   └── home/           # Dashboard de demandas
│   └── app.ts, app.routes.ts, app.config.ts
├── environments/           # Configurações Firebase
└── styles.scss            # Estilos globais