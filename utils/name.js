// name.js
import chalk from 'chalk';

export function printName() {
    console.log(chalk.blueBright(`
    +==============================================================+                                 
    |              ${chalk.yellowBright('Bot Transfer ETH to Random Address')}              |
    |                    ${chalk.greenBright('Network: All EVM Chain')}                    |
    |                   ${chalk.magentaBright('Author: Prastian Hidayat')}                   |
    +==============================================================+
    `));
}