// banner.js
import chalk from "chalk";

export function getBannerText() {
  return chalk.cyan(`
  ██████╗ ██████╗  ██████╗    ██╗  ██╗██╗   ██╗██████╗ ███████╗
  ██╔══██╗██╔══██╗██╔════╝    ██║  ██║██║   ██║██╔══██╗██╔════╝
  ██████╔╝██████╔╝██║         ███████║██║   ██║██████╔╝███████╗
  ██╔══██╗██╔═══╝ ██║         ██╔══██║██║   ██║██╔══██╗╚════██║
  ██║  ██║██║     ╚██████╗    ██║  ██║╚██████╔╝██████╔╝███████║
  ╚═╝  ╚═╝╚═╝      ╚═════╝    ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
                                                              
  `)
  + chalk.yellow("STORK NETWORK AUTOMATION")
  + chalk.blue("\nTelegram Channel: https://t.me/RPC_Hubs\n");
}
