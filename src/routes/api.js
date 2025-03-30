const express = require('express');
const { createUser, handleLogin, getUser, getAccount } = require('../controllers/userController');
const auth = require('../middleware/auth');
const delay = require('../middleware/delay');
const { createAccounts, getAccounts, updateAccount, deleteAccount } = require('../controllers/accountController');
const { getCategories, createCategories, updateCategories, deleteCategories } = require('../controllers/categoryController');
const { getTransactions, createTransactions, updateTransactions, deleteTransactions } = require('../controllers/transactionController');
const { getBudgets, createBudgets, updateBudgets, deleteBudgets } = require('../controllers/budgetController');
const { getNotifications, markAsRead, deleteNotification } = require('../controllers/notificationController');
const { getReportsBarChart, getReportsPieChart } = require('../controllers/reportController');
const { getDashboardCards, getDashboardLineChart, getRecentTransaction } = require('../controllers/dashboardController');

const routerAPI = express.Router();

routerAPI.all("*", auth);

routerAPI.get("/", (req, res) => {
    return res.status(200).json("Hello world");
})

routerAPI.post("/register", createUser);
routerAPI.post("/login", handleLogin);

routerAPI.get("/user", getUser);
routerAPI.get("/account", delay, getAccount);

routerAPI.post("/accounts", createAccounts);
routerAPI.get("/accounts", getAccounts);
routerAPI.put("/accounts", updateAccount);
routerAPI.delete("/accounts", deleteAccount);

routerAPI.get("/categories", getCategories);
routerAPI.post("/categories", createCategories);
routerAPI.put("/categories", updateCategories);
routerAPI.delete("/categories", deleteCategories);

routerAPI.get("/transactions", getTransactions);
routerAPI.post("/transactions", createTransactions);
routerAPI.put("/transactions", updateTransactions);
routerAPI.delete("/transactions", deleteTransactions);

routerAPI.get("/budgets", getBudgets);
routerAPI.post("/budgets", createBudgets);
routerAPI.put("/budgets", updateBudgets);
routerAPI.delete("/budgets", deleteBudgets);

routerAPI.get("/notifications", getNotifications);
routerAPI.put("/notifications/:id/read", markAsRead);
routerAPI.delete("/notifications/:id", deleteNotification);

routerAPI.get("/reports/bar", getReportsBarChart);
routerAPI.get("/reports/pie", getReportsPieChart);

routerAPI.get("/dashboard/cards", getDashboardCards);
routerAPI.get("/dashboard/linechart", getDashboardLineChart);
routerAPI.get("/dashboard/recenttransactions", getRecentTransaction);

module.exports = routerAPI;