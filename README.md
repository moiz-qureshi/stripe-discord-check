# Stripe Discord Role Bot

Assigns a VIP role on your Discord server when someone completes a Stripe checkout.

## API

- `POST /assign-role`  
  Required body:  
  ```json
  {
    "discordUsername": "Soup#1234",
    "role": "VIP"
  }


---

## ✅ Push it to GitHub

1. Create a new repo on GitHub
2. Push your project:

```bash
git init
git remote add origin https://github.com/yourusername/stripe-discord-check.git
git add .
git commit -m "Initial commit"
git push -u origin main

