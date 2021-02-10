let dDragonVersion = '';
let LoLDragonAPI_version = 'https://ddragon.leagueoflegends.com/api/versions.json';
let LoLDragonAPI_items = (version) => 'https://ddragon.leagueoflegends.com/cdn/' + version + '/data/en_US/item.json';

let data;
let items;

let baseStatsPrice = [
    // Flat
    { mainName: 'Move Speed', value: 12, isPercentage: false },
    { mainName: 'Mana', value: 1.4, isPercentage: false },
    { mainName: 'Health', value: 2 + 2 / 3, isPercentage: false },
    { mainName: 'Armor', value: 20, isPercentage: false },
    { mainName: 'Magic Resist', value: 18, isPercentage: false },
    { mainName: 'Attack Damage', value: 35, isPercentage: false },
    { mainName: 'Ability Power', value: 21.75, isPercentage: false },
    { mainName: 'Magic Penetration', value: 560 / 18, isPercentage: false },
    { mainName: 'Ability Haste', value: 26 + 2 / 3, isPercentage: false },
    { mainName: 'Lethality', value: 5, isPercentage: false },
    // Percentage
    { mainName: 'Omnivamp', value: 119 / 3, isPercentage: true },
    { mainName: 'Heal and Shield Power', value: 55, isPercentage: true },
    { mainName: 'Move Speed', value: 39.5, isPercentage: true },
    { mainName: 'Critical Strike Chance', value: 40, isPercentage: true },
    { mainName: 'Armor Penetration', value: 37.5, isPercentage: true },
    { mainName: 'Life Steal', value: 37.5, isPercentage: true },
    { mainName: 'Base Mana Regen', value: 5, isPercentage: true },
    { mainName: 'Base Health Regen', value: 3, isPercentage: true },
    { mainName: 'Attack Speed', value: 25, isPercentage: true }
];

$(document).ready(function () {
    gatherCookies();
    getDDragonVersion();
});

function imageErrorHandler(evt) {
    $(this).remove();
}

function pageFormat() {
    $('<img width=20 height=15 src="https://static.wikia.nocookie.net/leagueoflegends/images/1/10/Gold.png">').appendTo('.item_stats .item_gold_equivalent');
    $('.category.title').hover(function () {
        $(this).toggleClass('hover');
    });

    $('body').prepend(function () {
        return ('<div id="informations">Game patch - ' + dDragonVersion + '</div>');
    });

    $('.category.title').click(function () {
        $(this).next('.collapsible').css('display', ($(this).next().css('display') == 'none') ? 'table' : 'none');
        $(this).toggleClass('hidden');
    });

    $('.hidden_tooltip').prepend(function () {
        $text = $('<div> <div class="item_name">' + $(this).parent().next().html() + '</div><br><span>' + $(this).attr('price') + '<img width="20" height="15" src="https://static.wikia.nocookie.net/leagueoflegends/images/1/10/Gold.png"></span> <div>');
        $img = $('<img src="' + $($(this).prev().children()[0]).attr('src') + '" width="64" height="64">');
        return $('<div class="item_tooltip_header"></div>').prepend($text).prepend($img);
    });

    let showTooltip = function (evt) {
        $('div.tooltip').remove();
        $elem = $('<div class="tooltip">' + $(this).children().last().html() + '</div>').appendTo('body');
        var tooltipX = event.pageX;
        var tooltipY = event.pageY;
        height = $('div.tooltip').height();
        bottomScreenBorder = $('body').outerHeight();
        tooltipY = (tooltipY + height >= bottomScreenBorder) ? tooltipY - height : tooltipY;
        $('div.tooltip').css({ top: tooltipY, left: tooltipX });
    };

    let hideTooltip = function () {
        $('div.tooltip').remove();
    };

    $('.item_img').bind({
        mouseenter: showTooltip,
        mouseleave: hideTooltip
    });

    $('th.sortable').click(function (evt) {
        let $tableElem, $rows, switching, i, x, y, shouldSwitch;
        let order = (a, b) => ($(this).hasClass('ascendant')) ? a < b : a > b;
        $tableElem = $(this).parent().parent().parent();
        switching = true;
        while (switching) {
            switching = false;
            $rows = ($($tableElem[0].firstChild).children());
            for (i = 1; i < ($rows.length - 1); i++) {
                shouldSwitch = false;
                x = parseFloat($($rows[i]).children('.' + $(this).attr('class').split(' ')[1]).text());
                y = parseFloat($($rows[i + 1]).children('.' + $(this).attr('class').split(' ')[1]).text());
                if (order(x, y)) {
                    shouldSwitch = true;
                    break;
                }
            }
            if (shouldSwitch) {
                $($rows[i + 1]).insertBefore($($rows[i]));
                switching = true;
            }
        }
        $(this).parent().children().toggleClass('ascendant');
    });
}

function calculateGoldEfficiency(item) {
    let totalStCost = getItemPriceFromStats(item);

    let doPrint = (item.name == 'Shurelya\'s Battlesong');

    let GE = totalStCost / item.gold.total;
    let res01 = (Math.round(GE * 100 * 100)) / 100;
    let res02 = -Math.round((item.gold.total - item.gold.total * GE) * 100) / 100;

    let res = { itemGoldEfficiency: isNaN(res01) ? 0 : res01, itemGoldEq: isNaN(res02) ? 0 : res02 };
    return res;
}

function buildElement(type, categoryName = '', categoryTitle = '', itemImgLink = '', itemName = '', goldEfficiency = 0, equivalentInGolds = 0, wikiLink = '', args = { tooltip: '', price: 0, maps: {} }) {
    let $elem = '';
    if (type == 'category')
        $elem = $('<h3 class="category title">' + categoryTitle + '</h3><table class="category collapsible" id="' + categoryName + '"><tbody><th></th><th></th><th class="sortable item_gold_efficiency">Gold Efficiency</th><th class="sortable item_gold_equivalent">Equivalent in golds</th><th>Maps</th></tbody></table>');
    else if (type == 'item') {
        let $supportedMaps = $('<span></span>');
        for (key in args.maps) {
            if (args.maps[key] == true) {
                $supportedMaps.append('<img src="https://ddragon.leagueoflegends.com/cdn/6.8.1/img/map/map' + key + '.png" onerror="javascript:imageErrorHandler.call(this, event);" width="32" height="32">');
            }
        }
        $elem = $('\
					<tr id="' + itemName.replace(/\s+/g, '').replace(/'/g, '') + '" class="item_stats" ...>\
						<td class="item_img">\
							<a target="_blank" href="' + wikiLink + '"><img src="' + itemImgLink + '" width="32" height="32" ></a>\
							<div class="hidden_tooltip" price="'+ args.price + '">' + args.tooltip + '</div>\
						</td>\
						<td class="item_name" >' + itemName + '</td>\
						<td class="item_gold_efficiency">' + goldEfficiency + '%</td>\
						<td class="item_gold_equivalent">' + equivalentInGolds + '</td>\
					</tr>'
        ).append($('<td class="item_supported_maps"></td>').append($supportedMaps));
    } else return;
    return $elem;
}

function getItemPriceFromStats(item) {
    let $desc = $(item.description);
    let statsHTML = $desc.find('stats').html();
    if (statsHTML) {
        let itemStatsList = statsHTML.split('<br>');
        let itemValue = 0;
        for (key in itemStatsList) {
            let stat = itemStatsList[key];
            let statValueStr = $(stat).text().trim();
            let statValue = parseFloat(statValueStr);
            let statName = stat.split('</attention>')[1].trim();
            let isPercentStat = statValueStr.substr(-1) == '%';
            for (i = 0; i < baseStatsPrice.length; i++)
                if (baseStatsPrice[i].mainName == statName && baseStatsPrice[i].isPercentage == isPercentStat)
                    itemValue += parseFloat((statValue * baseStatsPrice[i].value).toFixed(2));
        }
        return (itemValue);
    }
    return 0;
}

function getDDragonVersion() {

    let oXHR = new XMLHttpRequest();
    oXHR.onreadystatechange = createListOfItems;
    oXHR.open('GET', LoLDragonAPI_version, true);
    oXHR.send();

    function createListOfItems() {
        if (oXHR.readyState != 4)
            return;
        let version = (JSON.parse(this.responseText))[0];

        let oXHR2;
        if (!data || version != dDragonVersion) {
            dDragonVersion = version;
            oXHR2 = new XMLHttpRequest();

            oXHR2.onreadystatechange = reportStatus;
            oXHR2.open('GET', LoLDragonAPI_items(dDragonVersion), true);
            oXHR2.send();
        } else {
            dDragonVersion = version;
            reportStatus();
        }

        function reportStatus() {
            if (oXHR2 && oXHR2.readyState != 4)
                return;
            if (oXHR2) data = (JSON.parse(this.responseText));
            items = data.data;

            for (const elem in items) {
                const item = items[elem];

                // Reset
                let categoryName = 'default';
                let categoryTitle = 'Default';

                if (item.gold.purchasable) {
                    if (item.tags.includes('Consumable')) { // Consumables
                        categoryName = 'consumable';
                        categoryTitle = 'Consumables';
                    } else if (item.tags.includes('Boots')) { // Boots
                        categoryName = 'boots';
                        categoryTitle = 'Boots';
                    } else if (item.tags.includes('Trinket')) { // Trinkets
                        categoryName = 'trinket';
                        categoryTitle = 'Trinkets';
                    } else if (item.description.includes('rarityMythic') && !item.into) { // Mythic
                        categoryName = 'mythic';
                        categoryTitle = 'Mythic Items';
                    } else if ((!item.from || item.from.length == 0) && (!item.into || item.into.length == 0)) { // Starter
                        categoryName = 'starter';
                        categoryTitle = 'Starter Items';
                    } else if (item.name != 'Sheen' && item.into && (!item.from || item.from.length == 0) && item.into.length > 0) { // Basic
                        categoryName = 'basic';
                        categoryTitle = 'Basic Items';
                    } else if (item.from && item.into && (item.description.includes('passive') || item.from.length > 0) && item.into.length > 0) { // Epic
                        categoryName = 'epic';
                        categoryTitle = 'Epic Items';
                    } else { // Legendary
                        categoryName = 'legendary';
                        categoryTitle = 'Legendary Items';
                    }
                } else {
                    categoryName = 'special';
                    categoryTitle = 'Special Items';
                }

                if (!$('#' + categoryName).length) {
                    $tmp = buildElement('category', categoryName, categoryTitle);
                    $('#item_table').append($tmp);
                }

                let tmp = calculateGoldEfficiency(item);

                let itemImgLink = 'https://ddragon.leagueoflegends.com/cdn/10.25.1/img/item/' + item.image.full;
                let itemName = item.name;
                let goldEfficiency = tmp.itemGoldEfficiency;
                let equivalentInGolds = tmp.itemGoldEq;
                let wikiLink = 'https://leagueoflegends.fandom.com/wiki/' + item.name.replace(/\s+/g, '_').replace(/'/g, '%27');
                let $elem = buildElement('item', '', '', itemImgLink, itemName, goldEfficiency, equivalentInGolds, wikiLink, { tooltip: item.description, price: item.gold.total, maps: item.maps });
                $('#' + categoryName).append($elem);
            }
            saveCookies();
            pageFormat();
        }
    }
}

function saveCookies() {
    localStorage.setItem('currentVersion', dDragonVersion);
    localStorage.setItem('data', JSON.stringify(data));
}

function gatherCookies() {
    let currentVersion = localStorage.getItem('currentVersion');
    if (currentVersion) dDragonVersion = currentVersion;

    let gatheredData = localStorage.getItem('data');
    if (gatheredData) data = JSON.parse(localStorage.getItem('data'));
}
