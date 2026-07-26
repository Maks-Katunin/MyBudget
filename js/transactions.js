import { auth, db } from "../firebase/firebase-config.js";

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// ======================================================
// Возвращает коллекцию операций текущего пользователя.
//
// Структура Firestore:
//
// users
//   └── UID
//        └── transactions
//             └── transactionId
// ======================================================

function getTransactionsCollection() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Пользователь не авторизован.");
  }

  return collection(db, "users", user.uid, "transactions");
}

// ======================================================
// Загружает операции текущего пользователя из Firestore.
// После загрузки обновляет массив и интерфейс.
// ======================================================

async function loadTransactionsFromFirestore() {
  try {
    const snapshot = await getDocs(getTransactionsCollection());

    const loadedTransactions = [];

    snapshot.forEach((documentSnapshot) => {
      loadedTransactions.push({
        ...documentSnapshot.data(),
        id: documentSnapshot.id,
      });
    });

    // Новые операции показываем сверху.
    loadedTransactions.sort((firstTransaction, secondTransaction) => {
      const firstDateTime = `${firstTransaction.date} ${firstTransaction.time}`;
      const secondDateTime = `${secondTransaction.date} ${secondTransaction.time}`;

      return secondDateTime.localeCompare(firstDateTime);
    });

    // Не создаём новый массив, а очищаем существующий.
    transactions.splice(0, transactions.length, ...loadedTransactions);

    renderSummary();
    renderTransactions();

    console.log("Transactions loaded from Firestore:", transactions);

    return true;
  } catch (error) {
    console.error("Firestore loading error:", error);
    return false;
  }
}

// ======================================================
// Очищает операции после выхода пользователя.
// ======================================================

function clearTransactions() {
  transactions.splice(0, transactions.length);

  renderSummary();
  renderTransactions();
}

// ======================================================
// Загружает все операции текущего пользователя из Firestore.
// ======================================================

/*
  Transactions module.

  This file is responsible for:
  - storing transactions;
  - adding new transactions;
  - returning transaction list.

  Later this module will also work with Firestore.
*/
// Загружаем ранее сохранённые операции из браузера.
// Если сохранённых данных нет, используем пустой массив.
let transactions = [];
let currentTransactionType = null;

// Показывает, выполняется ли сейчас сохранение операции.
// Нужен для защиты от повторных быстрых нажатий.
let isSaving = false;

let currentPeriod = "all";

/*
  Меняет выбранный период и активную кнопку.
*/
function setCurrentPeriod(period) {
  currentPeriod = period;

  const periodButtons = document.querySelectorAll("[data-period]");

  periodButtons.forEach((button) => {
    const isActive = button.dataset.period === currentPeriod;

    button.classList.toggle("active", isActive);
  });

  console.log("Current period:", currentPeriod);
}

/*
  Returns transactions for the selected period.
*/
function getFilteredTransactions() {
  switch (currentPeriod) {
    case "week":
      return transactions;

    case "month":
      return transactions;

    case "year":
      return transactions;

    case "all":
    default:
      return transactions;
  }
}

/*
  Adds a new transaction to the local list.

  transaction example:
  {
    id: "1",
    type: "income",
    amount: 15000,
    currency: "KGS",
    title: "Зарплата",
    date: "2026-07-09",
    time: "09:15"
  }
*/

async function addTransaction(transaction) {
  try {
    await addDoc(getTransactionsCollection(), transaction);

    await loadTransactionsFromFirestore();

    console.log("Transaction saved to Firestore");
  } catch (error) {
    console.error("Firestore save error:", error);
  }
}
/*
  Returns all transactions.

  We return the array for now.
  Later we may return filtered or sorted data.
*/

function getTransactions() {
  return transactions;
}

function getTransactionById(id) {
  return transactions.find((transaction) => transaction.id === id);
}

/*
  Возвращает текущий баланс пользователя.
*/
function getCurrentBalance() {
  let balance = 0;

  transactions.forEach((transaction) => {
    if (transaction.type === "income") {
      balance += transaction.amount;
    }

    if (transaction.type === "expense") {
      balance -= transaction.amount;
    }
  });

  return balance;
}

/*
  Создаёт операцию, которая приводит расчётный баланс
  к фактическому балансу пользователя.

  actualBalance — реальная сумма пользователя.
  title — название операции:
  "Начальный остаток" или "Корректировка".
*/
async function createBalanceAdjustment(actualBalance, title) {
  const calculatedBalance = getCurrentBalance();

  // Находим разницу между реальным
  // и рассчитанным балансом.
  const difference = actualBalance - calculatedBalance;

  // Если значения совпадают,
  // создавать новую операцию не нужно.
  if (difference === 0) {
    return {
      created: false,
      reason: "balance-is-correct",
    };
  }

  const now = new Date();

  const adjustmentTransaction = {
    type: difference > 0 ? "income" : "expense",

    // Сумма всегда хранится положительным числом.
    // Направление задаётся через type.
    amount: Math.abs(difference),

    currency: "KGS",
    title,

    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
  };

  await addTransaction(adjustmentTransaction);

  return {
    created: true,
    difference,
  };
}

/*
  Обновляет только сумму и заметку существующей операции.

  Тип операции, дата, время, валюта и ID
  остаются без изменений.
*/
async function updateTransaction(id, updatedData) {
  try {
    const transactionRef = doc(getTransactionsCollection(), id);

    await updateDoc(transactionRef, {
      amount: updatedData.amount,
      title: updatedData.title,
    });

    await loadTransactionsFromFirestore();

    console.log("Transaction updated in Firestore:", id);

    return true;
  } catch (error) {
    console.error("Firestore update error:", error);
    return false;
  }
}

/*
  Удаляет операцию по её ID.
*/
async function deleteTransaction(id) {
  try {
    const transactionRef = doc(getTransactionsCollection(), id);

    await deleteDoc(transactionRef);

    await loadTransactionsFromFirestore();

    console.log("Transaction deleted from Firestore:", id);

    return true;
  } catch (error) {
    console.error("Firestore delete error:", error);
    return false;
  }
}

/*
Все операции теперь хранятся в Firestore.

Массив transactions содержит только
данные, загруженные из облака.
*/

function saveTransactions() {
  console.log("saveTransactions(): Firestore mode");
}

/*
  Обновляет:
  - общий текущий остаток;
  - доход за выбранный период;
  - расход за выбранный период.
*/
function renderSummary() {
  let allIncomeTotal = 0;
  let allExpenseTotal = 0;

  transactions.forEach((transaction) => {
    if (transaction.type === "income") {
      allIncomeTotal += transaction.amount;
    }

    if (transaction.type === "expense") {
      allExpenseTotal += transaction.amount;
    }
  });

  const filteredTransactions = getFilteredTransactions();

  let periodIncomeTotal = 0;
  let periodExpenseTotal = 0;

  filteredTransactions.forEach((transaction) => {
    if (transaction.type === "income") {
      periodIncomeTotal += transaction.amount;
    }

    if (transaction.type === "expense") {
      periodExpenseTotal += transaction.amount;
    }
  });

  const balance = getCurrentBalance();

  const incomeValue = document.querySelector('[data-role="income-value"]');

  const expenseValue = document.querySelector('[data-role="expense-value"]');

  const balanceValue = document.querySelector('[data-role="balance-value"]');

  incomeValue.textContent = periodIncomeTotal;
  expenseValue.textContent = periodExpenseTotal;
  balanceValue.textContent = balance;
}

/*
  Opens transaction modal.

  type can be:
  - "income"
  - "expense"
*/
function openTransactionModal(type) {
  currentTransactionType = type;
  const template = document.querySelector("#transaction-modal-template");
  const modal = template.content.cloneNode(true);
  const root = document.querySelector("#modal-root");

  const title = modal.querySelector('[data-role="transaction-title"]');

  if (type === "income") {
    title.textContent = "Новый доход";
  }

  if (type === "expense") {
    title.textContent = "Новый расход";
  }

  root.replaceChildren(modal);

  // После добавления окна в HTML ставим курсор в поле суммы.
  const amountInput = root.querySelector('[name="amount"]');

  if (amountInput) {
    amountInput.focus();
  }
}

/*
  Открывает существующую операцию для просмотра и редактирования.
*/
function openTransactionDetails(transaction) {
  const template = document.querySelector("#transaction-modal-template");
  const modal = template.content.cloneNode(true);
  const root = document.querySelector("#modal-root");

  const modalTitle = modal.querySelector('[data-role="transaction-title"]');

  const form = modal.querySelector('[data-form="transaction"]');

  const amountInput = form.querySelector('[name="amount"]');
  const titleInput = form.querySelector('[name="title"]');
  const submitButton = form.querySelector('[type="submit"]');

  // Запоминаем ID редактируемой операции внутри формы
  form.dataset.transactionId = transaction.id;

  // Заполняем форму текущими данными
  modalTitle.textContent = "Редактирование операции";
  amountInput.value = transaction.amount;
  titleInput.value =
    transaction.title === "Без заметки" ? "" : transaction.title;

  submitButton.textContent = "Сохранить изменения";
  // Создаём кнопку удаления операции
  const deleteButton = document.createElement("button");

  deleteButton.type = "button";
  deleteButton.className = "modal-button danger";
  deleteButton.dataset.action = "delete-transaction";
  deleteButton.dataset.id = transaction.id;
  deleteButton.textContent = "Удалить операцию";

  // Добавляем кнопку в конец формы
  form.append(deleteButton);

  root.replaceChildren(modal);

  // При редактировании выделяем текущую сумму.
  const amountInputInModal = root.querySelector('[name="amount"]');

  if (amountInputInModal) {
    amountInputInModal.focus();
    amountInputInModal.select();
  }
}

/*
  Обрабатывает форму создания или редактирования операции.
*/
async function handleTransactionSubmit(event) {
  // Не разрешаем браузеру перезагружать страницу.
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  // Получаем и очищаем данные формы.
  const amount = Number(formData.get("amount"));
  const title = formData.get("title").trim() || "Без заметки";

  // Сначала проверяем сумму.
  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Введите сумму больше нуля.");
    return;
  }

  // Если сохранение уже выполняется,
  // повторное нажатие ничего не делает.
  if (isSaving) {
    return;
  }

  // Отмечаем, что сохранение началось.
  isSaving = true;

  // Находим кнопку сохранения.
  const submitButton = form.querySelector('[type="submit"]');

  // Запоминаем исходный текст кнопки.
  const originalButtonText = submitButton.textContent;

  // Блокируем кнопку.
  submitButton.disabled = true;

  // Включаем режим загрузки.
  submitButton.classList.add("loading");
  try {
    // Этот ID существует только при редактировании.
    const transactionId = form.dataset.transactionId;

    console.log("Editing ID:", transactionId);

    if (transactionId) {
      // Редактируем существующую операцию.
      await updateTransaction(transactionId, {
        amount,
        title,
      });
    } else {
      // Создаём новую операцию.
      const now = new Date();

      const transaction = {
        id: crypto.randomUUID(),
        type: currentTransactionType,
        amount,
        currency: "KGS",
        title,
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 5),
      };

      await addTransaction(transaction);
    }

    // Закрываем модальное окно только после успешного сохранения.
    const root = document.querySelector("#modal-root");
    root.replaceChildren();

    console.log("All transactions:", getTransactions());
  } catch (error) {
    console.error("Transaction submit error:", error);

    alert("Не удалось сохранить операцию. Попробуйте ещё раз.");

    // Возвращаем кнопку в обычное состояние,
    // потому что окно остаётся открытым.
    submitButton.disabled = false;
    submitButton.classList.remove("loading");
  } finally {
    isSaving = false;

    submitButton.disabled = false;
    submitButton.classList.remove("loading");
  }
}

function renderTransactions() {
  const list = document.querySelector('[data-role="transactions-list"]');

  list.innerHTML = "";

  const filteredTransactions = getFilteredTransactions();

  for (const transaction of filteredTransactions) {
    const button = document.createElement("button");

    button.className = "transaction-item";
    button.type = "button";

    // Сохраняем ID операции внутри кнопки
    button.dataset.id = transaction.id;

    // Сообщаем общему обработчику кликов,
    // что эта кнопка открывает выбранную операцию
    button.dataset.action = "open-transaction";

    button.innerHTML = `
      <span class="transaction-icon"></span>

      <span class="transaction-info">
        <span class="transaction-title">
          ${transaction.title}
        </span>

        <span class="transaction-time">
          ${transaction.time}
        </span>
      </span>

      <span class="transaction-amount ${transaction.type}">
        <span class="amount-value">
          ${transaction.type === "income" ? "+" : "-"}${transaction.amount}
        </span>

        <span class="currency-code">
          ${transaction.currency}
        </span>
      </span>
    `;

    list.append(button);
  }
}

clearTransactions();

export {
  addTransaction,
  getTransactions,
  getCurrentBalance,
  createBalanceAdjustment,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  openTransactionModal,
  openTransactionDetails,
  handleTransactionSubmit,
  renderSummary,
  renderTransactions,
  setCurrentPeriod,
  getFilteredTransactions,
  loadTransactionsFromFirestore,
  clearTransactions,
};
