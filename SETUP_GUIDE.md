# Salus Setup Guide

To win the **MongoDB** and **Domain.com** prizes, you need to set up the following external services.

## 1. MongoDB Atlas (Vector Search)

### A. Create Cluster
1.  Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and Sign Up/Log In.
2.  Create a **Free Tier (M0)** Cluster (Provider: AWS, Region: N. Virginia or closest).
3.  **Database Access:** Create a user (e.g., `admin`) and save the password.
4.  **Network Access:** Allow Access from Anywhere (`0.0.0.0/0`) for the hackathon.

### B. Get Connection String
1.  Click **Connect** -> **Drivers**.
2.  Copy the connection string. It looks like:
    `mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
3.  Update your `.env.local`:
    ```bash
    MONGO_URI="mongodb+srv://admin:YOUR_PASSWORD@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
    ```

### C. Configure Vector Search Index
*Crucial for the Prize: "Best Use of Atlas Vector Search"*
1.  Go to **Atlas Search** tab -> **Create Search Index**.
2.  Select **JSON Editor**.
3.  Select Database: `salus_db` -> Collection: `laws`.
4.  Paste this configuration:
    ```json
    {
      "name": "vector_index",
      "type": "vectorSearch",
      "fields": [
        {
          "type": "vector",
          "path": "embedding",
          "numDimensions": 768,
          "similarity": "cosine"
        }
      ]
    }
    ```
5.  Click **Create**.

---

## 2. Domain.com (.tech)

### A. Register Domain
1.  Go to [MLH Domain.com Partner Page](https://domain.com/mlh) (or standard site).
2.  Search for `salus-app.tech` (or similar).
3.  Use the MLH promo code if available (usually `MLH` or given at event) for free registration.

### B. Deploy Frontend (Vercel)
1.  Go to [Vercel](https://vercel.com).
2.  Import your GitHub Repo.
3.  Add Environment Variables (`NEXT_PUBLIC_GEMINI_API_KEY`).
4.  Deploy.

### C. Point Domain
1.  In Vercel -> Settings -> Domains, add `salus-app.tech`.
2.  Vercel will give you DNS records (A Record: `76.76.21.21`).
3.  Go to **Domain.com** DNS Management.
4.  Add the **A Record** `@` points to `76.76.21.21`.
