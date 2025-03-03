import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { getBannerText } from './banner.js';

export function createDashboard() {
    const screen = blessed.screen({
        smartCSR: true,
        title: 'Stork Network Automation Dashboard'
    });

    const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

    const bannerBox = grid.set(0, 0, 3, 12, blessed.box, {
        label: 'BANNER',
        content: getBannerText(), 
        tags: false,          
        align: 'center',        
        valign: 'middle',      
        style: {
            fg: 'white',
            bg: 'black'
        },
        border: {
            type: 'line'
        }
    });

    const statsTable = grid.set(3, 0, 3, 12, contrib.table, {
        keys: true,
        fg: 'white',
        label: 'STATS',
        columnSpacing: 2,
        columnWidth: [30, 15, 15, 30]
    });

    const logBox = grid.set(6, 0, 6, 12, contrib.log, {
        label: 'LOGS',
        fg: 'green',
        selectedFg: 'green',
        scrollbar: {
            ch: ' ',
            track: { bg: 'grey' },
            style: { inverse: true }
        }
    });

    screen.key(['escape', 'q', 'C-c'], function () {
        process.exit(0);
    });

    screen.render();
    return { screen, statsTable, logBox };
}

/**
 * @param {Object} statsTable
 * @param {Object} data
 */
export function updateStats(statsTable, data) {
    const tableData = {
        headers: ['User', 'Valid', 'Invalid', 'Last Verified'],
        data: [
            [
                data.user || 'N/A',
                data.valid || 0,
                data.invalid || 0,
                data.lastVerified || 'Never'
            ]
        ]
    };
    statsTable.setData(tableData);
    statsTable.screen.render();
}

/**
 * @param {Object} logBox
 * @param {String} msg
 */
export function logMessage(logBox, msg) {
    logBox.log(msg);
    logBox.screen.render();
}
