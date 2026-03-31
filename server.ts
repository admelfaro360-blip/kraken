import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Kraken Handyman OS" });
  });

  // Business Config (Initial Data)
  let businessConfig = {
    fixedCosts: [
      { id: '1', name: 'Seguro Responsabilidad Civil', amount: 5 },
      { id: '2', name: 'Seguro Accidentes Laborales', amount: 190 },
      { id: '3', name: 'Seguro Camioneta', amount: 21 },
      { id: '4', name: 'Mantenimiento Vehículo', amount: 100 },
      { id: '5', name: 'Gestión Empresa (Magency)', amount: 300 }
    ],
    variableCosts: [],
    daysPerMonth: 24,
    halfDayCostOficial: 40,
    halfDayCostAyudante: 30,
    guaranteePct: 0.08,
    materialMarkup: 0.25,
    iva: 0.23,
    transportZones: [
      { id: 1, name: 'Zona 1 (Base)', amount: 10 },
      { id: 2, name: 'Zona 2', amount: 15 },
      { id: 3, name: 'Zona 3', amount: 20 },
      { id: 4, name: 'Zona 4', amount: 30 }
    ]
  };

  // Ensure JSON files exist
  const initFile = async (file: string, initialData: any) => {
    try {
      await fs.access(path.join(process.cwd(), file));
    } catch (e) {
      await fs.writeFile(path.join(process.cwd(), file), JSON.stringify(initialData, null, 2));
    }
  };

  await initFile("users.json", [{ id: '1', username: 'admin', password: 'admin1234', role: 'admin', email: 'admelfaro360@gmail.com' }]);
  await initFile("budgets.json", []);
  await initFile("work_orders.json", []);
  await initFile("clients.json", []);
  await initFile("expenses.json", []);

  // User "Table" (Mock for now, ready for DB)
  let users = JSON.parse(await fs.readFile(path.join(process.cwd(), "users.json"), "utf-8"));

  const saveUsers = async () => {
    await fs.writeFile(path.join(process.cwd(), "users.json"), JSON.stringify(users, null, 2));
  };

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      res.json({ 
        success: true, 
        user: { id: user.id, username: user.username, role: user.role, email: user.email } 
      });
    } else {
      res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }
  });

  app.get("/api/users", (req, res) => {
    res.json(users.map(u => ({ id: u.id, username: u.username, role: u.role, email: u.email })));
  });

  app.post("/api/users", async (req, res) => {
    const newUser = { ...req.body, id: Math.random().toString(36).substr(2, 9) };
    users.push(newUser);
    await saveUsers();
    res.json(newUser);
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...req.body };
      await saveUsers();
      res.json(users[index]);
    } else {
      res.status(404).json({ message: "Usuario no encontrado" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    users = users.filter(u => u.id !== id);
    await saveUsers();
    res.json({ success: true });
  });

  // Budgets "Table"
  let budgets = JSON.parse(await fs.readFile(path.join(process.cwd(), "budgets.json"), "utf-8"));
  const saveBudgets = async () => {
    await fs.writeFile(path.join(process.cwd(), "budgets.json"), JSON.stringify(budgets, null, 2));
  };

  // Work Orders "Table"
  let workOrders = JSON.parse(await fs.readFile(path.join(process.cwd(), "work_orders.json"), "utf-8"));
  const saveWorkOrders = async () => {
    await fs.writeFile(path.join(process.cwd(), "work_orders.json"), JSON.stringify(workOrders, null, 2));
  };

  app.get("/api/budgets", (req, res) => {
    res.json(budgets);
  });

  app.post("/api/budgets", async (req, res) => {
    const newBudget = { ...req.body };
    const index = budgets.findIndex(b => b.id === newBudget.id);
    if (index !== -1) {
      budgets[index] = newBudget;
    } else {
      budgets.push(newBudget);
    }
    await saveBudgets();
    res.json(newBudget);
  });

  app.delete("/api/budgets/:id", async (req, res) => {
    const { id } = req.params;
    budgets = budgets.filter(b => b.id !== id);
    await saveBudgets();
    res.json({ success: true });
  });

  app.get("/api/work-orders", (req, res) => {
    res.json(workOrders);
  });

  app.post("/api/work-orders", async (req, res) => {
    const newOrder = { ...req.body };
    const index = workOrders.findIndex(o => o.id === newOrder.id);
    if (index !== -1) {
      workOrders[index] = newOrder;
    } else {
      workOrders.push(newOrder);
    }
    await saveWorkOrders();
    res.json(newOrder);
  });

  app.delete("/api/work-orders/:id", async (req, res) => {
    const { id } = req.params;
    workOrders = workOrders.filter(o => o.id !== id);
    await saveWorkOrders();
    res.json({ success: true });
  });

  // Expenses "Table"
  let expenses = JSON.parse(await fs.readFile(path.join(process.cwd(), "expenses.json"), "utf-8"));
  const saveExpenses = async () => {
    await fs.writeFile(path.join(process.cwd(), "expenses.json"), JSON.stringify(expenses, null, 2));
  };

  app.get("/api/expenses", (req, res) => {
    res.json(expenses);
  });

  app.post("/api/expenses", async (req, res) => {
    const newExpense = { ...req.body };
    const index = expenses.findIndex(e => e.id === newExpense.id);
    if (index !== -1) {
      expenses[index] = newExpense;
    } else {
      expenses.push(newExpense);
    }
    await saveExpenses();
    res.json(newExpense);
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    const { id } = req.params;
    expenses = expenses.filter(e => e.id !== id);
    await saveExpenses();
    res.json({ success: true });
  });

  app.post("/api/reset", async (req, res) => {
    budgets = [];
    workOrders = [];
    clients = [];
    expenses = [];
    await saveBudgets();
    await saveWorkOrders();
    await saveClients();
    await saveExpenses();
    res.json({ success: true });
  });

  // Reminder Endpoint
  // Clients "Table"
  let clients = JSON.parse(await fs.readFile(path.join(process.cwd(), "clients.json"), "utf-8"));
  const saveClients = async () => {
    await fs.writeFile(path.join(process.cwd(), "clients.json"), JSON.stringify(clients, null, 2));
  };

  app.get("/api/clients", (req, res) => {
    res.json(clients);
  });

  app.post("/api/clients", async (req, res) => {
    const newClient = { ...req.body };
    const index = clients.findIndex(c => c.id === newClient.id);
    if (index !== -1) {
      clients[index] = newClient;
    } else {
      clients.push(newClient);
    }
    await saveClients();
    res.json(newClient);
  });

  app.delete("/api/clients/:id", async (req, res) => {
    const { id } = req.params;
    clients = clients.filter(c => c.id !== id);
    await saveClients();
    res.json({ success: true });
  });

  app.get("/api/reminders/next-week", (req, res) => {
    const today = new Date();
    // Calculate next week's range (starting next Monday)
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday
    const daysToNextMonday = (8 - dayOfWeek) % 7 || 7;
    const nextMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysToNextMonday);
    const nextSunday = new Date(nextMonday.getFullYear(), nextMonday.getMonth(), nextMonday.getDate() + 6);

    const nextWeekOrders = workOrders.filter(o => {
      if (!o.startDate) return false;
      const [year, month, day] = o.startDate.split('-').map(Number);
      const start = new Date(year, month - 1, day);
      const duration = o.duration || 1;
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + duration - 1);
      return (start <= nextSunday && end >= nextMonday);
    });

    const nextWeekBudgets = budgets.filter(b => {
      if (!b.startDate || (b.status !== 'aprobado' && b.status !== 'ejecucion')) return false;
      const [year, month, day] = b.startDate.split('-').map(Number);
      const start = new Date(year, month - 1, day);
      const duration = b.phases?.reduce((acc, phase) => acc + (phase.days || 0), 0) || 1;
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + duration - 1);
      return (start <= nextSunday && end >= nextMonday);
    });

    res.json({
      range: { start: nextMonday.toISOString(), end: nextSunday.toISOString() },
      orders: nextWeekOrders,
      budgets: nextWeekBudgets
    });
  });

  app.get("/api/config", (req, res) => {
    res.json(businessConfig);
  });

  app.post("/api/config", (req, res) => {
    businessConfig = req.body;
    res.json({ success: true, config: businessConfig });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Kraken Handyman OS running on http://localhost:${PORT}`);
  });
}

startServer();
