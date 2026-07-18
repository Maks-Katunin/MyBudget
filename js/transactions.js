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
const transactions =
  JSON.parse(localStorage.getItem("mybudget-transactions")) || [];

let currentTransactionType = null;

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

function addTransaction(transaction) {
  transactions.unshift(transaction);

  // После изменения массива сразу сохраняем его в браузере.
  saveTransactions();
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
/*
  Обновляет только сумму и заметку существующей операции.

  Тип операции, дата, время, валюта и ID
  остаются без изменений.
*/
function updateTransaction(id, updatedData) {
  const transaction = getTransactionById(id);

  // Если операция с таким ID не найдена,
  // прекращаем выполнение функции.
  if (!transaction) {
    console.error("Transaction not found:", id);
    return false;
  }

  // Изменяем только разрешённые поля.
  transaction.amount = updatedData.amount;
  transaction.title = updatedData.title;

  // Сохраняем обновлённый массив в localStorage.
  saveTransactions();

  return true;
}

/*
  Удаляет операцию по её ID.
*/
function deleteTransaction(id) {
  // Ищем индекс операции в массиве.
  const transactionIndex = transactions.findIndex(
    (transaction) => transaction.id === id,
  );

  // Если операция не найдена, возвращаем false.
  if (transactionIndex === -1) {
    console.error("Transaction not found:", id);
    return false;
  }

  // Удаляем одну операцию из массива.
  transactions.splice(transactionIndex, 1);

  // Сохраняем обновлённый массив в localStorage.
  saveTransactions();

  return true;
}

/*
  Сохраняет текущий массив операций в localStorage.

  localStorage хранит данные в браузере даже после
  обновления страницы или закрытия вкладки.
*/
function saveTransactions() {
  localStorage.setItem("mybudget-transactions", JSON.stringify(transactions));
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

  const balance = allIncomeTotal - allExpenseTotal;

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
function handleTransactionSubmit(event) {
  // Не разрешаем браузеру перезагружать страницу.
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  // Получаем и очищаем данные формы.
  const amount = Number(formData.get("amount"));
  const title = formData.get("title").trim() || "Без заметки";

  // Проверяем сумму.
  if (!Number.isFinite(amount) || amount <= 0) {
    alert("Введите сумму больше нуля.");
    return;
  }

  // Этот ID существует только при редактировании.
  const transactionId = form.dataset.transactionId;

  console.log("Editing ID:", transactionId);

  if (transactionId) {
    // Редактируем существующую операцию.
    updateTransaction(transactionId, {
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

    addTransaction(transaction);
  }

  // Обновляем итоговые суммы и список операций.
  renderSummary();
  renderTransactions();

  // Закрываем модальное окно.
  const root = document.querySelector("#modal-root");
  root.replaceChildren();

  console.log("All transactions:", getTransactions());
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

renderSummary();
renderTransactions();

export {
  addTransaction,
  getTransactions,
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
};
