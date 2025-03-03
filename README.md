# Stork Network Automation 🚀

An automated validation bot for the Stork Network Automation. This bot helps automate the verification process to earn rewards through the Stork Oracle system.

## 🌟 Features

✅ Automatically fetches signed price data from Stork Oracle API  
✅ Validates price data according to predefined rules  
✅ Submits validation results back to the API  
✅ Handles token refresh for continuous operation  
✅ Displays validation statistics and user information  
✅ Configurable validation interval  
✅ Support for proxy servers to distribute requests  
✅ Multi-threaded processing for improved performance  

---

## 🛠 Requirements

- Node.js 14.0.0 or higher  
- Valid Stork Oracle account  

---

## 📥 Installation

### 🖥 Windows

1️⃣ **Download and install Node.js** (LTS version recommended) from [Node.js official site](https://nodejs.org/).  
2️⃣ **Open Command Prompt (cmd)** and execute the following commands one by one:
   
🔹 **Clone the repository:**
```sh
git clone https://github.com/rpchubs/Stork-Network-Automation.git
```

🔹 **Navigate to the project folder:**
```sh
cd Stork-Network-Automation
```

🔹 **Install dependencies:**
```sh
npm install
```

3️⃣ **Configure your credentials** (See Configuration Section Below).  
4️⃣ **Start the bot:**
```sh
node index.js
```

---

### 🍏 macOS

1️⃣ **Install Homebrew** (if not installed) to manage packages:
```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2️⃣ **Install Node.js using Homebrew:**
```sh
brew install node
```

3️⃣ **Open Terminal** and execute the following commands one by one:
   
🔹 **Clone the repository:**
```sh
git clone https://github.com/rpchubs/Stork-Network-Automation.git
```

🔹 **Navigate to the project folder:**
```sh
cd Stork-Network-Automation
```

🔹 **Install dependencies:**
```sh
npm install
```

4️⃣ **Configure your credentials** (See Configuration Section Below).  
5️⃣ **Start the bot:**
```sh
node index.js
```

---

### 🐧 Linux (Ubuntu/Debian)

1️⃣ **Update your system packages to the latest versions:**
```sh
sudo apt update && sudo apt upgrade -y
```

2️⃣ **Install Node.js and npm:**
```sh
sudo apt install -y nodejs npm
```

3️⃣ **Clone the repository and install dependencies. Execute each command separately:**
   
🔹 **Clone the repository:**
```sh
git clone https://github.com/rpchubs/Stork-Network-Automation.git
```

🔹 **Navigate to the project folder:**
```sh
cd Stork-Network-Automation
```

🔹 **Install dependencies:**
```sh
npm install
```

4️⃣ **Configure your credentials** (See Configuration Section Below).  
5️⃣ **Start the bot:**
```sh
node index.js
```

---

## ⚙ Configuration

### ✏ Setting Up Your Accounts

1️⃣ **Edit the `accounts.js` file** and add your credentials:

```javascript
export const accounts = [
  { username: "your_email@example.com", password: "your_password" },
  { username: "your_second_email@example.com", password: "your_second_password" }
];
```

🔹 You can add multiple accounts by adding more lines.

### 🌍 Proxy Setup

To use proxy servers for distributing requests, edit `proxies.txt`:

🔹 **Add one proxy per line** in any of these formats:

```plaintext
http://user:pass@host:port
socks5://user:pass@host:port
```

---

## 🚀 Usage

Start the bot with:
```sh
node index.js
```

The bot will:
1️⃣ Authenticate using your credentials from `accounts.js`
2️⃣ Fetch signed price data at regular intervals
3️⃣ Validate each data point
4️⃣ Submit validation results to Stork Oracle
5️⃣ Display your current statistics

---

## 🛠 Advanced Configuration

You can adjust advanced settings in `config.json`:

🔹 `stork.intervalSeconds`: How often the validation process runs in seconds (default: 5)  
🔹 `threads.maxWorkers`: Number of concurrent validation workers (default: 1)  

---

## 🔧 Troubleshooting

💡 **If you see authentication errors:**
- Check that your username and password in `accounts.js` are correct.
- Ensure your proxies (if used) are properly configured.

💡 **If the bot fails to start:**
- Check that `config.json` is properly formatted.
- Delete `tokens.json` if you see token-related errors and let the bot regenerate it.

💡 **For connection issues:**
- Verify your internet connection.
- Ensure the Stork Oracle API is accessible.

---

## ⚠ Disclaimer

This bot is provided for educational purposes only. Use at your own risk. The authors are not responsible for any consequences that may arise from using this bot, including but not limited to account termination or loss of rewards.

---

## 📜 License

🔹 MIT License

---

## 🤝 Contributing

Contributions are welcome! Feel free to submit a Pull Request. 😊

## 🔗 Useful Resources

📂 **GitHub Repository**: [RPC Hubs](https://github.com/rpchubs)\
💬 **Community Support**: [Telegram](https://t.me/RPC_Hubs)\
📜 **License**: MIT License

---

💡 **Need Help?** Join our Telegram group for real-time support and discussions! 🚀