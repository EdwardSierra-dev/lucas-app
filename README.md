# lucas-app

# 🐷 Lucas - Home Finance Control

> **Lucas** is a cross-platform web and mobile application designed to help households intuitively and collaboratively manage their income, expenses, budgets, and savings goals.

---

## 🚀 Key Features

- **Transaction Management:** Quick entry for income and expenses with customizable categories.
- **Shared Household Accounts:** Real-time data synchronization across household members.
- **Family Budgets:** Monthly spending limits by category with visual progress and alerts.
- **Clear Reports:** Interactive charts showing spending patterns and cash flow history.
- **Multi-Platform Access:** Unified user experience on both Android devices and Web browsers.

---

## 🛠️ Architecture & Tech Stack

The project leverages a **single codebase for multi-platform deployment** on the frontend and a JavaScript/TypeScript backend to maintain full-stack consistency.

### **Tech Stack**

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend (Android & Web)** | React Native (Expo) + React Native Web | Single codebase for cross-platform UI |
| **Backend API** | Node.js (Express / NestJS) | RESTful API for business logic execution |
| **Database** | PostgreSQL (via Supabase / Hosting) | ACID-compliant relational DB for financial integrity |
| **Authentication** | JWT / OAuth2 | Secure identity and session management |

---

### **Architech Diagram**

---
```textplain
+-------------------------------------------------------------+
|                          LUCAS APP                          |
|                                                             |
|   +-------------------+             +-------------------+   |
|   |    Android App    |             |      Web App      |   |
|   +---------+---------+             +---------+---------+   |
|             |                                 |             |
|             +----------------+----------------+             |
|                              | (React Native / Expo)        |
+------------------------------+------------------------------+
                               |
                               | HTTP / WebSockets
                               v
+-------------------------------------------------------------+
|                           BACKEND                           |
|            Node.js (Express / NestJS) or Supabase           |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                          DATABASE                           |
|                    PostgreSQL (Cloud)                       |
+-------------------------------------------------------------+
```


## 📁 Project Structure

```text
lucas/
├── apps/
│   └── client/           # React Native App (Expo - Android & Web)
├── server/               # Node.js API Backend (Express/NestJS)
├── docs/                 # Documentation and architecture diagrams
└── README.md             # Main repository documentation