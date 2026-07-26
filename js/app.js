import { auth, db } from "../firebase/firebase-config.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

import {
  openTransactionModal,
  handleTransactionSubmit,
  getTransactions,
  getTransactionById,
  openTransactionDetails,
  deleteTransaction,
  renderSummary,
  renderTransactions,
  setCurrentPeriod,
  loadTransactionsFromFirestore,
  clearTransactions,
  getCurrentBalance,
  createBalanceAdjustment,
} from "./transactions.js";

let currentUser = null;

// ======================================================
// Создаёт профиль пользователя в Firestore,
// если такого документа ещё нет.
//
// Путь:
// users/{uid}
// ======================================================
async function ensureUserProfile(user) {
  if (!user) {
    return null;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  // Если профиль уже существует, просто возвращаем его данные.
  if (userSnapshot.exists()) {
    const profile = {
      id: userSnapshot.id,
      ...userSnapshot.data(),
    };

    console.log("User profile loaded:", profile);

    return profile;
  }

  // Создаём профиль только при первом входе.
  const newProfile = {
    email: user.email || "",
    displayName: user.displayName || "",
    currency: "KGS",
    balanceInitialized: false,
    createdAt: serverTimestamp(),
  };

  await setDoc(userRef, newProfile);

  console.log("User profile created:", user.uid);

  return {
    id: user.uid,
    ...newProfile,
  };
}

// ======================================================
// Предлагает указать начальный остаток.
//
// Окно показывается только один раз:
// пока в профиле пользователя balanceInitialized !== true.
// ======================================================
async function setupInitialBalance(user, profile) {
  if (!user) {
    return;
  }

  // Начальный остаток уже был настроен.
  if (profile?.balanceInitialized === true) {
    return;
  }

  const existingTransactions = getTransactions();

  // Поддержка пользователей, которые начали пользоваться
  // приложением до появления функции начального остатка.
  if (existingTransactions.length > 0) {
    const userRef = doc(db, "users", user.uid);

    await setDoc(
      userRef,
      {
        balanceInitialized: true,
      },
      {
        merge: true,
      },
    );

    return;
  }

  const enteredValue = prompt("Введите сумму, которая у вас есть сейчас:", "0");

  // Пользователь нажал «Отмена».
  // В следующий раз приложение снова предложит настройку.
  if (enteredValue === null) {
    return;
  }

  const initialBalance = Number(enteredValue.replace(",", "."));

  if (!Number.isFinite(initialBalance) || initialBalance < 0) {
    alert("Введите корректную сумму.");
    return;
  }

  try {
    // При нулевом остатке операция не нужна.
    if (initialBalance > 0) {
      await createBalanceAdjustment(initialBalance, "Начальный остаток");
    }

    const userRef = doc(db, "users", user.uid);

    // Запоминаем, что первоначальная настройка завершена.
    await setDoc(
      userRef,
      {
        balanceInitialized: true,
      },
      {
        merge: true,
      },
    );

    console.log("Initial balance initialized:", initialBalance);
  } catch (error) {
    console.error("Initial balance error:", error);

    alert("Не удалось сохранить начальный остаток.");
  }
}

// ======================================================
// Следим за состоянием авторизации пользователя.
// Эта функция автоматически вызывается:
//
// • после входа;
// • после выхода;
// • после обновления страницы.
//
// Firebase сам сообщает приложению,
// вошёл пользователь или нет.
// ======================================================
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  updateProfileCard(user);

  if (user) {
    console.log("Пользователь авторизован:", user.email);

    const profile = await ensureUserProfile(user);

    const transactionsLoaded = await loadTransactionsFromFirestore();

    if (transactionsLoaded) {
      await setupInitialBalance(user, profile);
    }
  } else {
    console.log("Пользователь не вошёл.");

    clearTransactions();
  }
});

const profileCard = document.querySelector(".profile-card");

profileCard.addEventListener("click", () => {
  openProfile();
});

document.addEventListener("click", async (event) => {
  // Закрыть окно
  if (event.target.dataset.action === "close-modal") {
    closeModal();
    return;
  }

  // Открыть окно входа
  if (event.target.dataset.action === "open-login") {
    openLogin();
    return;
  }

  // Открыть окно регистрации
  if (event.target.dataset.action === "open-register") {
    openRegister();
    return;
  }

  // Выйти из аккаунта
  if (event.target.dataset.action === "logout") {
    signOut(auth)
      .then(() => {
        console.log("Logout success");
        closeModal();
      })
      .catch((error) => {
        console.log("Logout error:", error.code);
        console.log(error.message);
      });

    return;
  }

  // Открыть окно добавления дохода
  if (event.target.closest("[data-action='open-income']")) {
    openTransactionModal("income");
    return;
  }

  // Открыть окно добавления расхода
  if (event.target.closest("[data-action='open-expense']")) {
    openTransactionModal("expense");

    return;
  }

  // Открыть корректировку текущего баланса
  if (event.target.closest('[data-action="open-balance-adjustment"]')) {
    // Корректировать баланс можно только после входа.
    if (!currentUser) {
      alert("Сначала войдите или зарегистрируйтесь.");
      openProfile();
      return;
    }

    const calculatedBalance = getCurrentBalance();

    const enteredValue = prompt(
      "Введите сумму, которая у вас есть сейчас:",
      calculatedBalance,
    );

    // Пользователь нажал «Отмена».
    if (enteredValue === null) {
      return;
    }

    // Разрешаем ввод с запятой: 12500,50
    const actualBalance = Number(enteredValue.replace(",", "."));

    if (!Number.isFinite(actualBalance) || actualBalance < 0) {
      alert("Введите корректную сумму.");
      return;
    }

    try {
      const result = await createBalanceAdjustment(
        actualBalance,
        "Корректировка",
      );

      if (!result.created) {
        alert("Баланс уже совпадает. Корректировка не требуется.");
        return;
      }

      console.log("Balance adjustment created:", result);
    } catch (error) {
      console.error("Balance adjustment error:", error);
      alert("Не удалось скорректировать баланс.");
    }

    return;
  }

  // Открыть выбранную операцию
  const transactionButton = event.target.closest(
    '[data-action="open-transaction"]',
  );

  // Удалить выбранную операцию
  const deleteButton = event.target.closest(
    '[data-action="delete-transaction"]',
  );

  if (deleteButton) {
    const confirmed = confirm(
      "Удалить эту операцию? Это действие нельзя отменить.",
    );

    if (!confirmed) {
      return;
    }

    const transactionId = deleteButton.dataset.id;

    deleteTransaction(transactionId);

    renderSummary();
    renderTransactions();

    closeModal();

    return;
  }

  if (transactionButton) {
    const transactionId = transactionButton.dataset.id;
    const transaction = getTransactionById(transactionId);

    console.log("Selected transaction:", transaction);

    openTransactionDetails(transaction);

    return;
  }

  // Переключить период
  const periodButton = event.target.closest("[data-period]");

  if (periodButton) {
    const period = periodButton.dataset.period;

    setCurrentPeriod(period);

    return;
  }

  // Показать или скрыть пароль
  if (event.target.dataset.action === "toggle-password") {
    const inputId = event.target.dataset.target;
    const passwordInput = document.querySelector(`#${inputId}`);

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      event.target.textContent = "🙈";
    } else {
      passwordInput.type = "password";
      event.target.textContent = "👁️";
    }

    return;
  }

  // Закрыть окно при клике на затемнённый фон
  if (event.target.classList.contains("modal")) {
    closeModal();
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.dataset.form === "transaction") {
    handleTransactionSubmit(event);
    return;
  }
  if (event.target.dataset.form === "login") {
    event.preventDefault();

    const formData = new FormData(event.target);
    const email = formData.get("email");
    const password = formData.get("password");

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log("Login success:", userCredential.user.email);
        closeModal();
      })
      .catch((error) => {
        console.log("Login error:", error.code);
        console.log(error.message);

        const errorText = event.target.querySelector(
          '[data-role="form-error"]',
        );
        errorText.textContent = getAuthErrorMessage(error.code);
      });

    return;
  }

  if (event.target.dataset.form === "register") {
    event.preventDefault();

    const formData = new FormData(event.target);
    const email = formData.get("email");
    const password = formData.get("password");

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log("Register success:", userCredential.user.email);
        closeModal();
      })
      .catch((error) => {
        console.log("Register error:", error.code);
        console.log(error.message);

        const errorText = event.target.querySelector(
          '[data-role="form-error"]',
        );
        errorText.textContent = getAuthErrorMessage(error.code);
      });

    return;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});

function openProfile() {
  const template = document.querySelector("#profile-modal-template");
  const modal = template.content.cloneNode(true);
  const root = document.querySelector("#modal-root");

  const modalText = modal.querySelector(".modal-text");
  const loginButton = modal.querySelector('[data-action="open-login"]');
  const registerButton = modal.querySelector('[data-action="open-register"]');
  const logoutButton = modal.querySelector('[data-action="logout"]');

  if (currentUser) {
    modalText.textContent = currentUser.email;

    loginButton.style.display = "none";
    registerButton.style.display = "none";
    logoutButton.style.display = "block";
  } else {
    modalText.textContent = "Вы ещё не вошли.";

    loginButton.style.display = "block";
    registerButton.style.display = "block";
    logoutButton.style.display = "none";
  }

  root.replaceChildren(modal);
}

function openLogin() {
  const template = document.querySelector("#login-modal-template");
  const modal = template.content.cloneNode(true);
  const root = document.querySelector("#modal-root");

  root.replaceChildren(modal);
}

function openRegister() {
  const template = document.querySelector("#register-modal-template");
  const modal = template.content.cloneNode(true);
  const root = document.querySelector("#modal-root");

  root.replaceChildren(modal);
}

function closeModal() {
  const root = document.querySelector("#modal-root");
  root.replaceChildren();
}

/*
  Обновляет карточку профиля на главном экране.

  user есть  -> показываем email пользователя.
  user null -> показываем текст для гостя.
*/
function updateProfileCard(user) {
  const profileSubtitle = document.querySelector(".profile-subtitle");

  if (user) {
    profileSubtitle.textContent = user.email;
    return;
  }

  profileSubtitle.textContent = "Войти или зарегистрироваться";
}

function getAuthErrorMessage(errorCode) {
  if (errorCode === "auth/invalid-credential") {
    return "Неверный email или пароль.";
  }

  if (errorCode === "auth/email-already-in-use") {
    return "Такой пользователь уже зарегистрирован.";
  }

  if (errorCode === "auth/weak-password") {
    return "Пароль должен содержать минимум 6 символов.";
  }

  if (errorCode === "auth/invalid-email") {
    return "Введите корректный email.";
  }

  return "Ошибка. Попробуйте ещё раз.";
}
document.addEventListener("input", (event) => {
  if (!event.target.classList.contains("modal-input")) {
    return;
  }

  const error = document.querySelector(".auth-error");

  if (error) {
    error.remove();
  }
});
