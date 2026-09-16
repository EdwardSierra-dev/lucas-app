# Requirements Document

## Introduction

Lucas App v1 is a cross-platform home finance control application for Android and Web, built with React Native (Expo) + React Native Web on the frontend and Node.js (NestJS/Express) with PostgreSQL (Supabase) on the backend. The app enables households to manage income, expenses, budgets, savings goals, and shared financial tracking collaboratively and intuitively.

The application covers six functional areas: user authentication and registration, personalized expense configuration, vehicle expense tracking, shared household budgets, financial metrics and filtering, and third-party loan management.

---

## Glossary

- **App**: The Lucas cross-platform application (Android + Web).
- **Auth_Service**: The backend service responsible for user registration, login, session management, and email notification dispatch.
- **User**: A registered individual who has completed the sign-up flow and holds an account in the system.
- **Email_Validator**: The client-side component that validates email format using a regular expression before submission.
- **Password_Validator**: The client-side component that enforces password security rules on input.
- **Expense_Configurator**: The frontend flow that allows users to define their fixed mandatory and non-mandatory monthly expenses.
- **Expense**: A financial outflow record associated with a user or household, categorized by type.
- **Category**: A label grouping expenses (e.g., Agua, Luz, Netflix). Categories may be predefined or user-defined.
- **Emoji_Picker**: The UI component that allows users to select an emoji when creating a custom expense category.
- **Vehicle_Module**: The optional feature that tracks vehicle-related expenses and key document expiration dates, activated when a user declares ownership of a vehicle.
- **Shared_Budget**: A financial workspace shared between exactly two users, in which both can contribute income records, expense records, and define a monthly spending limit.
- **Budget_Manager**: The backend service responsible for managing shared budget memberships, income, expenses, and monthly limits.
- **Notification_Service**: The backend service that dispatches push notifications and in-app alerts to users for payment reminders and budget invitations.
- **Metrics_Engine**: The backend and frontend component responsible for computing and displaying filtered financial summaries.
- **Loan_Module**: The feature that allows users to record loan repayment obligations, distinguishing between bank loans and personal loans.
- **Payment_Date**: The scheduled day of the month when a recurring expense or loan installment is due.

### UX/UI Color Palette

The App uses a pastel color palette designed for a modern, friendly home finance experience.

| Role | Color Name | Hex |
|:---|:---|:---|
| Primary / CTA buttons | Soft Lavender | `#B8A9E3` |
| Secondary / panels background | Mint Green | `#A8D8C2` |
| Accent / alerts & highlights | Peach | `#F2B8A0` |
| Neutral background | Cloud White | `#F7F5FF` |
| Text & borders | Slate Gray | `#6B7280` |

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to create an account with my email and a secure password, so that I can access the App and manage my personal finances.

#### Acceptance Criteria

1. WHEN a user submits a registration form, THE Email_Validator SHALL verify that the email address matches the format `local-part@domain.tld`, where the local part contains only alphanumeric characters, dots, underscores, or hyphens, and the domain contains at least one dot, before the form is sent to the Auth_Service.
2. IF the email format is invalid, THEN THE Email_Validator SHALL display an inline validation error message adjacent to the email input field indicating that the email address format is invalid, and SHALL prevent form submission.
3. THE Password_Validator SHALL enforce that the password contains a minimum of 8 characters and a maximum of 128 characters, at least 1 uppercase letter, at least 1 digit, and at least 1 special character from the set `!@#$%^&*()_+-=[]{}|;':",.<>?/`.
4. IF the password does not meet the security criteria, THEN THE Password_Validator SHALL display a descriptive inline error message listing each unmet criterion individually, and SHALL prevent form submission.
5. THE App SHALL render a password confirmation input field on the registration screen.
6. IF the value in the password confirmation field does not match the value in the password field, THEN THE App SHALL display an inline error message indicating the passwords do not match, and SHALL prevent form submission.
7. WHEN a user successfully completes registration, THE App SHALL display a modal informing the user that the registration was successful and that a confirmation email has been sent.
8. WHEN a user successfully completes registration, THE Auth_Service SHALL send a confirmation email to the registered email address within 60 seconds.
9. IF the Auth_Service determines that the submitted email address is already associated with an existing account, THEN THE Auth_Service SHALL reject the registration request and THE App SHALL display an inline error message adjacent to the email input field indicating that the email address is already registered.
10. IF the Auth_Service fails to process the registration request, THEN THE App SHALL display an error message indicating that registration could not be completed and prompt the user to try again, without clearing the values already entered in the form fields.

---

### Requirement 2: Mandatory Fixed Monthly Expenses Configuration

**User Story:** As a user completing the initial setup, I want to configure my mandatory monthly expenses from a predefined list and add custom ones, so that the App can track my unavoidable financial obligations.

#### Acceptance Criteria

1. WHEN the user enters the mandatory expenses configuration step, THE Expense_Configurator SHALL display a modal with the message: "Estos gastos mensuales son aquellos que no puedes dejar de pagar o sino pailas papi 💪🏻" and a dismiss action that, when activated, closes the modal and proceeds to display the expense list.
2. THE Expense_Configurator SHALL render a multi-selection list containing the following predefined categories: Agua, Luz, Gas, Arriendo, Comida, Internet, Colegio, Transporte.
3. WHEN the user activates the add button (+), THE Expense_Configurator SHALL open a form for the user to enter a custom category name of 1 to 30 characters and select an emoji using the Emoji_Picker.
4. WHEN a user submits a custom category form with a valid name and an emoji, THE Expense_Configurator SHALL add the custom category to the selectable expense list.
5. IF a user submits a custom category form without a name, without an emoji, or with a name that contains only whitespace, THEN THE Expense_Configurator SHALL display a validation error within the form, keep the form open, and SHALL NOT add the category to the list.
6. IF a user submits a custom category form with a name that matches an existing category name (case-insensitive), THEN THE Expense_Configurator SHALL display a duplicate name validation error within the form and SHALL NOT add the category to the list.
7. THE Expense_Configurator SHALL allow the user to deselect any predefined category, removing it from the active expense list without deleting it from the predefined list, and SHALL allow the user to permanently delete any custom category from the list.
8. WHEN a user selects an expense category, THE Expense_Configurator SHALL allow the user to optionally assign a Payment_Date, defined as a day of the month with a valid value between 1 and 28, to that category.
9. WHEN a Payment_Date for a mandatory expense is one day away and WHEN the Payment_Date is reached, THE Notification_Service SHALL send a payment reminder notification to the user for that expense category.
10. THE Expense_Configurator SHALL display a question asking the user whether they own a vehicle, with binary Yes/No options.
11. WHERE the user declares vehicle ownership, THE App SHALL activate the Vehicle_Module for that user's account, making vehicle-related features visible and accessible to the user.

---

### Requirement 3: Non-Mandatory Fixed Monthly Expenses Configuration

**User Story:** As a user completing the initial setup, I want to configure my optional subscription and non-essential monthly expenses, so that I can track discretionary spending.

#### Acceptance Criteria

1. WHEN the user enters the non-mandatory expenses configuration step, THE Expense_Configurator SHALL display a modal with the message: "Estos gastos son aquellos que quieres pero no los necesitas 😎 alguien tenía que decírtelo" and a visible "Omitir" button that dismisses the modal and proceeds to the expense list when activated.
2. WHILE the user is on the non-mandatory expenses configuration step, THE Expense_Configurator SHALL render a multi-selection list containing the following predefined categories: Netflix, Spotify, Amazon Prime.
3. WHEN the user activates the add (+) button on the non-mandatory expenses configuration step, THE Expense_Configurator SHALL allow the user to add a custom non-mandatory category using a name input (1–40 characters) and the Emoji_Picker flow defined in Requirement 2, up to a maximum of 20 custom categories.
4. WHEN the user removes a non-mandatory category from the expense list, THE Expense_Configurator SHALL remove it from the currently displayed selection list; if the removed category is a predefined one, THE Expense_Configurator SHALL allow it to be re-added from the predefined list.
5. WHEN a user selects a non-mandatory expense category, THE Expense_Configurator SHALL allow the user to assign a Payment_Date to that category, where Payment_Date is a day of the month expressed as an integer between 1 and 28 inclusive.
6. WHEN a Payment_Date is reached for a non-mandatory expense, THE Notification_Service SHALL send a payment reminder notification to the user at 09:00 local time on that day.

---

### Requirement 4: Vehicle Expense Tracking

**User Story:** As a vehicle owner, I want to register my vehicle's details and key document expiration dates, so that the App can help me track vehicle-related expenses and avoid lapses in mandatory documentation.

#### Acceptance Criteria

1. WHERE the Vehicle_Module is active, THE App SHALL present a vehicle registration modal with the title "Páseme los datos del maquinón" after the user completes the mandatory and non-mandatory expense configuration.
2. THE Vehicle_Module SHALL require the user to provide: vehicle type, vehicle model, purchase or registration date, SOAT expiration date, and Tecnomecánica expiration date.
3. IF the user attempts to submit the vehicle registration form with any required field empty, THEN THE Vehicle_Module SHALL display a validation error identifying each missing field and SHALL NOT save the record.
4. THE Vehicle_Module SHALL allow the user to optionally provide a road emergency kit renewal date (Fecha kit de carretera); an empty value for this field SHALL be treated as valid and SHALL NOT block form submission.
5. IF the user enters a purchase or registration date that is later than the current calendar date, THEN THE Vehicle_Module SHALL display a validation error and SHALL NOT accept the date.
6. IF the user enters a SOAT or Tecnomecánica expiration date that is earlier than the purchase or registration date, THEN THE Vehicle_Module SHALL display a validation error and SHALL NOT accept that expiration date.
7. WHEN the user successfully submits the vehicle registration form, THE Vehicle_Module SHALL save the record and dismiss the modal.
8. WHEN the SOAT expiration date is within 30 calendar days of the current date, THE Notification_Service SHALL send an expiration reminder notification to the user identifying the SOAT as the expiring document.
9. WHEN the Tecnomecánica expiration date is within 30 calendar days of the current date, THE Notification_Service SHALL send an expiration reminder notification to the user identifying the Tecnomecánica as the expiring document.
10. WHEN the road emergency kit renewal date is set and is within 30 calendar days of the current date, THE Notification_Service SHALL send an expiration reminder notification to the user identifying the road emergency kit as the expiring item.

---

### Requirement 5: Shared Household Budget

**User Story:** As a user, I want to create or join a shared budget with another household member, so that we can collaboratively track our combined income, expenses, and monthly spending limit.

#### Acceptance Criteria

1. THE App SHALL allow a user to record personal income entries, each with an amount between 0.01 and 999,999,999.99 and a description of up to 255 characters.
2. THE App SHALL allow a user to invite another user to a Shared_Budget by entering the invitee's registered email address.
3. IF the invited email address does not correspond to a registered User, THEN THE Budget_Manager SHALL reject the invitation and THE App SHALL display an error message stating that no account was found for the provided email address, without clearing the email input field.
4. WHEN a user is invited to a Shared_Budget, THE Notification_Service SHALL send an in-app notification to the invited user within 30 seconds of the invitation being issued.
5. WHEN an invited user accepts a Shared_Budget invitation, THE Budget_Manager SHALL grant both users read and write access to all income records, expense records, and the monthly budget limit within that Shared_Budget.
6. WHEN a member of a Shared_Budget adds an income entry, THE Budget_Manager SHALL accept and persist an income amount between 0.01 and 999,999,999.99 and a description of up to 255 characters.
7. WHEN a member of a Shared_Budget adds an expense record, THE Budget_Manager SHALL accept and persist an expense amount between 0.01 and 999,999,999.99 and a description of up to 255 characters.
8. IF a member submits an income or expense entry with an amount outside the range 0.01–999,999,999.99 or with a description exceeding 255 characters, THEN THE Budget_Manager SHALL reject the entry and THE App SHALL display a validation error identifying the invalid field.
9. WHEN a member of a Shared_Budget removes an expense record, THE Budget_Manager SHALL delete that expense record and recalculate the current total expenses for the Shared_Budget.
10. WHEN a member of a Shared_Budget sets or updates the monthly spending limit, THE Budget_Manager SHALL accept and persist a limit value between 0.01 and 999,999,999.99.
11. IF a member submits a monthly spending limit of zero or less, or a value exceeding 999,999,999.99, THEN THE Budget_Manager SHALL reject the submission and THE App SHALL display a validation error.
12. WHEN total recorded expenses in a Shared_Budget first exceed the defined monthly spending limit, THE Notification_Service SHALL send a single alert notification to all members of the Shared_Budget for that crossing event.

---

### Requirement 6: Financial Metrics and Filtering

**User Story:** As a user, I want to filter and summarize my expenses by time period, category, and household member, so that I can understand spending patterns and make informed financial decisions.

#### Acceptance Criteria

1. WHEN the user selects a calendar month as a filter, THE Metrics_Engine SHALL apply that month as a filter criterion on the expense records.
2. WHEN the user selects a Category as a filter, THE Metrics_Engine SHALL apply that Category (e.g., Gas, Agua, Netflix) as a filter criterion on the expense records.
3. WHEN the user specifies a start date and an end date as a date range filter, THE Metrics_Engine SHALL apply that date range as a filter criterion, including both the start date and end date as bounds, on the expense records.
4. WHILE a Shared_Budget is active, THE Metrics_Engine SHALL allow the user to filter expense records by exactly one individual member of the Shared_Budget per filter operation.
5. WHEN the user applies a combined filter of up to 5 calendar months and one Category, THE Metrics_Engine SHALL compute and display the total sum of matching expense records within 2 seconds of filter confirmation.
6. WHEN the Metrics_Engine displays filtered results, THE Metrics_Engine SHALL present a summary view containing the computed total sum and, for each matching expense record, at minimum the amount, date, category, and description fields.
7. IF the user specifies a date range filter where the start date is later than the end date, THEN THE Metrics_Engine SHALL reject the filter and display an error message indicating the invalid date range without modifying the currently displayed results.
8. IF the applied filters match zero expense records, THEN THE Metrics_Engine SHALL display a total sum of zero and a message indicating no records were found for the selected filters.

---

### Requirement 7: Third-Party Loan Management

**User Story:** As a user, I want to record loan repayment obligations and track installment details, so that I can monitor the true cost of debt including interest.

#### Acceptance Criteria

1. WHEN a user creates a new expense record and selects "Préstamo" as the category, THE Loan_Module SHALL present a two-option selection prompt asking whether the loan source is a bank ("Banco") or a person ("Persona").
2. IF the loan source is a bank, THEN THE Loan_Module SHALL require the user to enter only the installment amount (cuota) and SHALL NOT display input fields for capital, interest rate, or number of installments.
3. IF the loan source is a bank and the user enters a cuota value of zero or less, THEN THE Loan_Module SHALL display a validation error and SHALL NOT save the record.
4. IF the loan source is a person, THEN THE Loan_Module SHALL require the user to enter the capital amount, the interest amount per installment, and the total number of installments (plazo).
5. IF the loan source is a person, THEN THE Loan_Module SHALL compute and display the total repayment amount as (capital + interest per installment × number of installments) prior to the user confirming the record.
6. IF the user submits a person-sourced loan record with a capital amount of zero or less, THEN THE Loan_Module SHALL display a validation error and SHALL NOT save the record.
7. IF the user submits a person-sourced loan record with an interest amount per installment that is less than zero, THEN THE Loan_Module SHALL display a validation error and SHALL NOT save the record.
8. IF the user submits a person-sourced loan record with a number of installments of zero or less, THEN THE Loan_Module SHALL display a validation error and SHALL NOT save the record.
9. THE App SHALL display all active loan records (records where installments paid is less than total installments) in a dedicated loans summary view, showing for each loan: the remaining installments (total installments minus installments paid) and the total outstanding amount (interest per installment × remaining installments for person loans; cuota × remaining installments for bank loans).

---

### Requirement 8: UX/UI Design Standards

**User Story:** As a user, I want a visually consistent, accessible, and friendly interface, so that managing finances feels approachable and not stressful.

#### Acceptance Criteria

1. THE App SHALL use only colors from the defined pastel palette (Soft Lavender `#B8A9E3`, Mint Green `#A8D8C2`, Peach `#F2B8A0`, Cloud White `#F7F5FF`, Slate Gray `#6B7280`) for all UI elements across all screens; no color outside this palette SHALL appear in buttons, panels, backgrounds, or text elements.
2. THE App SHALL render all interactive elements (buttons, inputs, modals) with a minimum touch target size of 44×44 logical pixels to meet accessibility standards.
3. THE App SHALL display all monetary values with exactly 2 decimal places and the currency symbol defined in the user's active currency setting.
4. THE App SHALL maintain the same component hierarchy, navigation structure, and visual layout across the Android and Web platforms, with the sole exception of platform-native navigation gestures (e.g., Android back swipe).
5. WHEN a modal is marked as skippable, THE App SHALL render a labeled "Omitir" dismiss button in the top-right corner of the modal with a minimum touch target of 44×44 logical pixels, which closes the modal without completing its flow.
