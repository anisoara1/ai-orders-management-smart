# AI Orders Management Smart

AI-powered order management application built with **SAP CAP**, **OpenUI5** and **Generative AI**.

The application provides two separate interfaces:

* **Manager Application** – for managing orders and AI recommendations
* **Customer Portal** – for customers to view and respond to offers

The backend is deployed on **Render**, while the UI5 applications are deployed on **GitHub Pages**.

---

## 🚀 Live Demo

### 👨‍💼 Manager – AI Orders Management

👉 https://anisoara1.github.io/ai-orders-management-smart/orders/

Use this application to:

* View all orders
* View customers and products
* Process orders
* Complete orders
* Generate AI recommendations
* Accept or reject AI recommendations
* Send offers to customers
* View discounts and delivery information
* Manage the order lifecycle

---

### 👤 Customer Portal

👉 https://anisoara1.github.io/ai-orders-management-smart/client/

The Customer Portal allows customers to:

* Enter their Customer ID
* View their orders
* View original order totals
* View offered discounts
* View final prices
* View delivery information
* Accept offers
* Reject offers

---

## 🔗 Backend API

The application backend is publicly deployed on Render:

https://ai-orders-management-smart.onrender.com/odata/v4/orders/

OData metadata:

https://ai-orders-management-smart.onrender.com/odata/v4/orders/$metadata

---

## 🏗️ Architecture

```text
                    ┌──────────────────────────┐
                    │      GitHub Pages        │
                    │                          │
                    │  AI Orders Management    │
                    │       /orders/            │
                    │                          │
                    │  Customer Portal         │
                    │       /client/            │
                    └────────────┬─────────────┘
                                 │
                                 │ HTTPS / OData V4
                                 ▼
                    ┌──────────────────────────┐
                    │         Render           │
                    │                          │
                    │      SAP CAP Backend     │
                    │                          │
                    │   /odata/v4/orders/      │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │         SQLite           │
                    │                          │
                    │ Customers                │
                    │ Products                 │
                    │ Orders                   │
                    │ OrderItems               │
                    │ AIRecommendations         │
                    │ OrderStatusHistory       │
                    └──────────────────────────┘
```

---

## 🛠️ Technologies

### Frontend

* OpenUI5
* SAPUI5 concepts and OData V4
* XML Views
* JavaScript
* JSON Models
* OData V4 Model
* SAP Horizon theme

### Backend

* SAP CAP
* Node.js
* OData V4
* SQLite
* Express middleware
* REST/OData actions

### AI

* Google Gemini
* `@google/genai`
* AI-generated order recommendations
* AI discount suggestions
* AI delivery recommendations

### Deployment

* GitHub
* GitHub Actions
* GitHub Pages
* Render

---

## 🤖 AI Order Recommendation

The manager can request an AI recommendation for an order.

The AI analyzes information such as:

* Product
* Unit price
* Quantity
* Total order value
* Order status
* Customer information
* Product stock

The AI recommendation can include:

* Recommended discount
* Recommended delivery time
* Confidence score
* Business reasoning

The manager can then:

```text
AI Recommendation
        │
        ├── Accept
        │      │
        │      ▼
        │   Send Offer
        │      │
        │      ▼
        │ Customer Portal
        │
        └── Reject
```

---

## 💰 Order Pricing

The application distinguishes between:

### Unit Price

The price of one product.

```text
Unit Price = price
```

### Original Order Total

```text
Original Total = Unit Price × Quantity
```

### Discount

The AI discount is applied to the complete order value.

```text
Discount Value =
Original Total × Discount / 100
```

### Final Total

```text
Final Total =
Original Total × (1 - Discount / 100)
```

This prevents the discount from being incorrectly applied only to the unit price.

---

## 🔄 Order and Offer Flow

```text
Pending
   │
   ▼
AI Recommendation
   │
   ├── Reject
   │
   └── Accept
         │
         ▼
     Send Offer
         │
         ▼
       SENT
         │
      Customer
         │
    ┌────┴────┐
    ▼         ▼
 ACCEPTED   REJECTED
```

---

## 📦 Main OData Entities

### Customers

Stores customer information.

```text
ID
name
email
city
```

### Products

Stores product information.

```text
ID
name
price
stock
category
```

### Orders

Stores order information.

```text
ID
customerID
product
quantity
price
originalPrice
finalPrice
appliedDiscount
deliveryDays
status
offerStatus
offeredDiscount
customerDecision
```

### OrderItems

Stores individual order items.

### AIRecommendations

Stores AI-generated recommendations.

```text
recommendation
reason
confidenceScore
suggestedDiscount
suggestedDeliveryDays
decisionStatus
appliedDiscount
```

### OrderStatusHistory

Stores order status changes.

---

## ⚙️ Local Development

Clone the repository:

```bash
git clone git@github.com:anisoara1/ai-orders-management-smart.git
cd ai-orders-management-smart
```

Install dependencies:

```bash
npm install
```

Deploy the local SQLite database:

```bash
./node_modules/.bin/cds-deploy
```

Start the CAP backend:

```bash
npm start
```

The backend will be available at:

```text
http://localhost:4004
```

---

## 🖥️ Run the Manager UI Locally

```bash
cd app/orders-ui
npm install
npx ui5 serve
```

The application will be available at:

```text
http://localhost:8080
```

---

## 👤 Run the Customer Portal Locally

```bash
cd app/client-ui
npm install
npx ui5 serve
```

The Customer Portal will be available at the URL shown by the UI5 development server.

---

## 🌐 Production Deployment

### Backend

The CAP backend is deployed on Render.

```text
https://ai-orders-management-smart.onrender.com
```

### Frontend

The UI5 applications are automatically built and deployed through GitHub Actions.

The deployment workflow builds:

```text
app/orders-ui
app/client-ui
```

and publishes them to GitHub Pages.

Production URLs:

```text
Manager:
https://anisoara1.github.io/ai-orders-management-smart/orders/

Customer:
https://anisoara1.github.io/ai-orders-management-smart/client/
```

---

## 🔐 CORS

The backend includes CORS configuration for the GitHub Pages deployment.

The frontend communicates with the CAP backend through:

```text
HTTPS
OData V4
$batch
```

The backend supports the required OData V4 headers for the UI5 OData V4 model.

---

## 🧪 Testing the Application

### Manager

1. Open the Manager application.
2. Select an order.
3. Generate an AI recommendation.
4. Review the recommendation.
5. Accept or reject it.
6. If accepted, send the offer to the customer.
7. Open the Customer Portal.

### Customer

1. Open the Customer Portal.
2. Enter the customer ID.
3. Load the orders.
4. Review an available offer.
5. Accept or reject the offer.

---

## 📁 Project Structure

```text
ai-orders-management-smart/
│
├── app/
│   ├── orders-ui/
│   │   └── webapp/
│   │
│   └── client-ui/
│       └── webapp/
│
├── db/
│   ├── data/
│   └── schema.cds
│
├── srv/
│   ├── service.cds
│   ├── service.js
│   └── server.js
│
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
│
├── package.json
├── README.md
└── .gitignore
```

---

## 🎯 Project Goals

The project demonstrates how modern enterprise technologies can be combined to create an intelligent order management solution.

Main goals:

* Enterprise backend with SAP CAP
* OData V4 service
* Modern OpenUI5 interfaces
* AI-assisted business decisions
* Automated order and offer workflow
* Customer self-service portal
* Cloud deployment
* GitHub Actions CI/CD
* Separation between manager and customer interfaces

---

## 👩‍💻 Author

**Anisoara Elena Cimpeanu**

Full Stack Developer

GitHub:

https://github.com/anisoara1
