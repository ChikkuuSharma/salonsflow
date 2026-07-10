# Oracle Cloud Infrastructure (OCI) Deployment Guide

This guide walks you through deploying the **SalonsFlow** application stack (Next.js frontend, NestJS backend, and PostgreSQL database) on **Oracle Cloud Infrastructure (OCI)** using the Free Tier Compute Instances and Docker Compose.

---

## Step 1: Create an OCI Compute Instance

1. Log into your **Oracle Cloud Console**.
2. Navigate to **Compute** -> **Instances** and click **Create Instance**.
3. Configure the following options:
   * **Name**: `salonsflow-production`
   * **Image**: **Ubuntu 22.04 LTS** (Canonical Ubuntu)
   * **Shape**: Select either:
     * `VM.Standard.E4.Flex` (AMD 1 OCPU, 1 GB RAM - Always Free)
     * `VM.Standard.A1.Flex` (Ampere ARM, up to 4 OCPUs, 24 GB RAM - Always Free, highly recommended!)
   * **Networking**: Assign a public IPv4 address.
   * **SSH Keys**: Download the generated private key pair (e.g. `ssh-key.key`). Save it securely.
4. Click **Create** and wait for the instance status to show **Running**. Note down the **Public IP Address**.

---

## Step 2: Configure Virtual Cloud Network (VCN) Ingress Rules

By default, OCI blocks all incoming internet traffic except for SSH. You must explicitly open ports in the OCI security lists.

1. On the Instance Details page, click on your **Virtual Cloud Network** (e.g., `vcn-xxxx`).
2. Click on **Security Lists** in the left sidebar, and select the **Default Security List** for your VCN.
3. Click **Add Ingress Rules** and add the following rules:

| Source CIDR | IP Protocol | Destination Port Range | Description |
| :--- | :--- | :--- | :--- |
| `0.0.0.0/0` | TCP (6) | `80` | HTTP traffic for Nginx |
| `0.0.0.0/0` | TCP (6) | `443` | HTTPS traffic for Nginx |
| `0.0.0.0/0` | TCP (6) | `3000` | Optional: Next.js Frontend bypass |
| `0.0.0.0/0` | TCP (6) | `3001` | Optional: NestJS API bypass |

---

## Step 3: Connect to your VM & Configure Local Firewalls (Important OCI Gotcha)

OCI's Ubuntu image has default local iptables rules that block inbound HTTP/HTTPS requests, *even if the VCN Ingress Rules are configured correctly*. You must open these ports on the OS level.

1. Connect to your instance via SSH:
   ```bash
   ssh -i /path/to/ssh-key.key ubuntu@<YOUR_VM_PUBLIC_IP>
   ```
2. Open the OS firewall ports:
   ```bash
   sudo iptables -I INPUT 6 -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
   sudo iptables -I INPUT 6 -p tcp --dport 3000 -j ACCEPT
   sudo iptables -I INPUT 6 -p tcp --dport 3001 -j ACCEPT
   
   # Make the firewall changes persistent across reboots
   sudo netfilter-persistent save
   ```

---

## Step 4: Install Docker & Docker Compose

Run the following commands on your Ubuntu instance to set up Docker:

```bash
# Update Ubuntu package index
sudo apt update && sudo apt upgrade -y

# Install Docker engine
sudo apt install -y docker.io docker-compose

# Start and enable Docker on system startup
sudo systemctl enable docker --now

# Add the default 'ubuntu' user to the docker group (avoids needing sudo for docker commands)
sudo usermod -aG docker ubuntu

# Log out and log back in to apply the group membership changes
exit
```

---

## Step 5: Configure Application Environment

1. SSH back into the server:
   ```bash
   ssh -i /path/to/ssh-key.key ubuntu@<YOUR_VM_PUBLIC_IP>
   ```
2. Clone your repository (or copy your code files to the VM):
   ```bash
   git clone <YOUR_REPOSITORY_URL> salonsflow
   cd salonsflow
   ```
3. Create a production `.env` file in the project root directory:
   ```bash
   nano .env
   ```
4. Paste the following configuration, filling in your actual production values:
   ```env
   # PostgreSQL configuration
   DB_USER=postgres
   DB_PASSWORD=your_secure_postgres_password_here
   DB_NAME=salonsflow
   
   # Clerk Auth API Configuration
   CLERK_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   
   # AI API Keys
   OPENAI_API_KEY=sk-proj-...
   GEMINI_API_KEY=AIzaSy...
   
   # WhatsApp Integration API Config
   WHATSAPP_TOKEN=EAAG...
   WHATSAPP_PHONE_NUMBER_ID=1234567890
   WHATSAPP_APP_SECRET=your_app_secret
   MISSED_CALL_SECRET=your_missed_call_secret_token
   
   # Next.js Build Variables
   NEXT_PUBLIC_API_URL=https://api.salonsflow.in
   ```

---

## Step 6: Build & Run the Container Stack

Run the following command in the project root folder to compile the docker containers and run the stack in background daemon mode:

```bash
docker-compose up --build -d
```

Verify that all three services are running cleanly:
```bash
docker-compose ps
```

---

## Step 7: Configure Nginx & Setup Free SSL (Let's Encrypt)

We route clean traffic from standard web ports (`80` & `443`) into the docker containers using Nginx.

1. Install Nginx and Certbot:
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```
2. Create Nginx virtual host mapping configurations:
   ```bash
   sudo nano /etc/nginx/sites-available/salonsflow
   ```
3. Paste the following proxy block configuration:
   ```nginx
   server {
       listen 80;
       server_name salonsflow.in www.salonsflow.in;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }

   server {
       listen 80;
       server_name api.salonsflow.in;

       location / {
           proxy_pass http://127.0.0.1:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
4. Enable the virtual host config and restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/salonsflow /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
5. Fetch and install SSL certificates automatically via Let's Encrypt:
   ```bash
   sudo certbot --nginx -d salonsflow.in -d www.salonsflow.in -d api.salonsflow.in
   ```
   *Certbot will ask if you want to redirect all HTTP traffic to HTTPS. Type `2` to redirect all requests to secure HTTPS.*

---

## Operations & Monitoring

* **Checking Logs**: `docker-compose logs -f`
* **Restarting Services**: `docker-compose restart`
* **Updating Code**:
  ```bash
  git pull origin main
  docker-compose up --build -d
  ```
