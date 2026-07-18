# Database Architecture

## Main idea

All user data belongs to one Firebase user.

Each user has their own private space in the database.

## Main structure

```text
users
  userId
    profile
    settings
    transactions
    noteSuggestions
    savingsGoals
```

---

# Transactions

Path:

````text
users/{userId}/transactions/{transactionId}

Purpose

Transactions store all income and expense records.

Fields

Purpose

Transactions store all income and expense records.

Fields

Rules
amount is required.
type is required.
note is optional, but recommended.
transactionDate is set to current date and time by default.
User can manually edit transaction date and time.
createdAt stores when the record was created.
updatedAt stores when the record was last edited.

Главное отличие:

```text
transactionDate = когда реально был доход/расход
createdAt = когда запись добавили в приложение
updatedAt = когда запись изменили
````
