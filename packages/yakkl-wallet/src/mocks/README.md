# 🔐 Mocks Directory

This directory contains **safe mock implementations** of private modules used in the YAKKL Smart Wallet (`yakkl-wallet`) project. These are *not* functional components — they are placeholders designed to allow public contributors to build, test, and explore the project **without access to private source code**.

---

## 📦 Why Does This Exist?

Some parts of the YAKKL system are proprietary or security-sensitive, such as:

- Advanced UI elements (`yakkl-ui-private`)
- Internal security logic (`yakkl-security`)
- Debug tooling only available in Pro builds

To avoid build errors and ensure a smooth developer experience, we provide *mock modules* here that mirror the real module paths but contain non-functional or visibly stubbed content.

---

## 🧩 How It Works

Each mock file here corresponds to a private component or module and typically:

- **Renders a visual warning** (in UI cases)
- **Implements a no-op fallback** (in logic cases)
- Allows the project to compile and run, even if functionality is missing

Example file structure: (some are only example files and not found anywhere)
```bash

/src
  /mocks/
    /yakkl-ui-private/
      securePin.svelte        ← Stub for SecurePINInput
      walletRecoveryForm.svelte
      secureTemplate.svelte     ← Shared warning UI used by mocks
    /yakkl-security
      auth.ts

```

In `vite.config.ts` or via build tooling, these mocks are aliased in public builds using `resolve.alias`, replacing private imports with safe equivalents.

---

## 🧪 For Contributors

If you're contributing to this project:

- You **do not need access** to the real private packages to contribute meaningfully.
- These mocks will be automatically used when the `PUBLIC_BUILD` environment flag is set to `true`.
- You can still work on core features, general UI, or logic layers.
- If you're working on a feature that depends on a private module, just leave a TODO comment or reach out to the core team for collaboration.

---

## ⚠️ Security Note

Mocks are intentionally incomplete and should **never attempt to replicate secure behavior**. They're purely for development scaffolding — not testing cryptography, auth flows, or anything sensitive.

---

## 🧠 See Also

- `yakkl-ui-private` – real private UI components (private repo)
- `yakkl-security` – internal cryptographic logic (never public)
- `vite.config.ts` – contains the alias logic to enable these mocks

---

🪵 *This readme brought to you by AICryptoGramps™. Stay safe out there, and don’t poke the bears.*


