"use strict";
var SortDirection;
(function (SortDirection) {
    SortDirection[SortDirection["asc"] = 0] = "asc";
    SortDirection[SortDirection["des"] = 1] = "des";
})(SortDirection || (SortDirection = {}));
const sort_direction_to_string = (dir) => {
    switch (dir) {
        case SortDirection.asc:
            return "asc";
        case SortDirection.des:
            return "des";
    }
};
document.addEventListener("DOMContentLoaded", () => {
    setup_random_box_simulation();
    void setup_map_value_area();
    const sortable_headers = document.querySelectorAll(".sortable");
    for (const header of sortable_headers) {
        header.addEventListener("click", change_table_sort);
    }
});
const load_json = (url) => {
    return new Promise((resolve) => {
        const req = new XMLHttpRequest();
        req.onreadystatechange = () => {
            if (req.readyState === 4 && req.status === 200) {
                resolve(JSON.parse(req.responseText));
            }
        };
        req.overrideMimeType("application/json");
        req.open("GET", `./build/data/${url}`, true);
        req.send();
    });
};
const base_enemies = [];
let enemies = {};
let maps = [];
let giants = [];
const map_active_value_result_cells = {};
const map_idle_value_result_cells = {};
let pattern_level_input = null;
let need_for_kill_input = null;
let enemy_invasion_input = null;
let multa_hostibus_input = null;
let bone_rib_whistle_input = null;
let bring_hell_input = null;
let doomed_input = null;
let big_troubles_input = null;
const evolved = {};
const giant_bought = {};
const MAX_PATTERN_LEVEL = 3;
const MIN_PATTERN_LEVEL = 1;
const setup_map_value_area = async () => {
    enemies = await load_json("enemies.json");
    maps = await load_json("maps.json");
    giants = await load_json("giants.json");
    const bonus_index = maps.findIndex((m) => m.name === "Bonus Stage");
    if (bonus_index !== -1) {
        maps.splice(bonus_index, 1);
    }
    delete enemies["Soul Goblin"];
    delete enemies["Soul Hobgoblin"];
    delete enemies["Soul Goblin Chief"];
    const options_area = document.getElementById("mapValueOptionsArea");
    const evolutions_list = document.getElementById("mapValueEvolutionsList");
    const giants_list = document.getElementById("mapValueGiantsList");
    const active_results_table = document.getElementById("mapValuesResultsTableActive");
    const idle_results_table = document.getElementById("mapValuesResultsTableIdle");
    if (options_area === null || evolutions_list === null || active_results_table === null || idle_results_table === null || giants_list === null) {
        return;
    }
    for (const [name, enemy] of Object.entries(enemies)) {
        if (enemy.base) {
            let evolved_enemy = enemy;
            do {
                if (evolved_enemy.evolution === undefined) {
                    break;
                }
                const evolved_name = evolved_enemy.evolution;
                evolved_enemy = enemies[evolved_enemy.evolution];
                evolutions_list.appendChild(create_evolution_checkbox(evolved_name, on_evolution_toggle));
            } while (evolved_enemy !== undefined);
            base_enemies.push(enemy);
        }
        evolved[name] = false;
    }
    for (const giant of giants) {
        giants_list.appendChild(create_evolution_checkbox(giant.name, on_giant_toggle));
        giant_bought[giant.name] = false;
    }
    const create_map_row = (table, map, type) => {
        const coins = document.createElement("td");
        const souls = document.createElement("td");
        if (type === "active") {
            map_active_value_result_cells[map.name] = { coins, souls };
        }
        else if (type === "idle") {
            map_idle_value_result_cells[map.name] = { coins, souls };
        }
        const map_row = document.createElement("tr");
        const map_name_cell = document.createElement("td");
        map_name_cell.textContent = map.name;
        map_row.appendChild(map_name_cell);
        map_row.appendChild(coins);
        map_row.appendChild(souls);
        table.appendChild(map_row);
    };
    for (const map of maps) {
        create_map_row(active_results_table, map, "active");
        create_map_row(idle_results_table, map, "idle");
    }
    pattern_level_input = document.querySelector("input[name=maxPatternLevel]");
    if (pattern_level_input !== null) {
        pattern_level_input.value = String(1);
        pattern_level_input.addEventListener("change", () => {
            if (pattern_level_input !== null) {
                const current_pattern_level_value = Number(pattern_level_input.value);
                if (isNaN(current_pattern_level_value)) {
                    pattern_level_input.value = String(MIN_PATTERN_LEVEL);
                }
                if (current_pattern_level_value > MAX_PATTERN_LEVEL) {
                    pattern_level_input.value = String(MAX_PATTERN_LEVEL);
                }
                else if (current_pattern_level_value < MIN_PATTERN_LEVEL) {
                    pattern_level_input.value = String(MIN_PATTERN_LEVEL);
                }
            }
            calculate_map_values();
        });
    }
    need_for_kill_input = document.querySelector("input[name=needForKill]");
    enemy_invasion_input = document.querySelector("input[name=enemyInvasion]");
    multa_hostibus_input = document.querySelector("input[name=multaHostibus]");
    bone_rib_whistle_input = document.querySelector("input[name=boneRibWhistle]");
    bring_hell_input = document.querySelector("input[name=bringHell]");
    doomed_input = document.querySelector("input[name=doomed]");
    big_troubles_input = document.querySelector("input[name=bigTroubles]");
    calculate_map_values();
};
const calculate_map_values = () => {
    calculate_map_values_active();
    calculate_map_values_idle();
};
const calculate_map_values_active = () => {
    var _a;
    if (pattern_level_input === null) {
        return;
    }
    const pattern_level = Number(pattern_level_input.value);
    const giants_chance_modifier = (big_troubles_input === null || big_troubles_input === void 0 ? void 0 : big_troubles_input.checked) ? 15 : 0;
    const enemy_spawn_chance_bonus = ((need_for_kill_input === null || need_for_kill_input === void 0 ? void 0 : need_for_kill_input.checked) ? 30 : 0) +
        ((enemy_invasion_input === null || enemy_invasion_input === void 0 ? void 0 : enemy_invasion_input.checked) ? 50 : 0) +
        ((multa_hostibus_input === null || multa_hostibus_input === void 0 ? void 0 : multa_hostibus_input.checked) ? 50 : 0) +
        ((bone_rib_whistle_input === null || bone_rib_whistle_input === void 0 ? void 0 : bone_rib_whistle_input.checked) ? 40 : 0) +
        ((bring_hell_input === null || bring_hell_input === void 0 ? void 0 : bring_hell_input.checked) ? 20 : 0) +
        ((doomed_input === null || doomed_input === void 0 ? void 0 : doomed_input.checked) ? 30 : 0);
    //assuming no boosting for now. It will just scale everything linearly anyway.
    const player_speed = 4; //distance units/second
    //distance units per giant
    const average_giant_distance = (250 / (giants_chance_modifier / 100 + 1) + 450 / (giants_chance_modifier / 100 + 1)) / 2; //in distance units
    const giants_per_second = player_speed / average_giant_distance;
    //distance units per pattern
    const average_pattern_distance = (60 / (enemy_spawn_chance_bonus / 100 + 1) + 90 / (enemy_spawn_chance_bonus / 100 + 1)) / 2; //in distance units
    const patterns_per_second = player_speed / average_pattern_distance;
    for (const map of maps) {
        let souls = 0;
        let coins = 0;
        for (const pattern of map.patterns) {
            if (pattern.level > pattern_level) {
                continue;
            }
            for (const enemy_name of pattern.enemies) {
                let enemy_data = enemies[enemy_name];
                if (enemy_data === undefined) {
                    console.log(`No enemy data found for ${enemy_name}, skipping enemy in pattern in ${map.name}`);
                    continue;
                }
                //find the highest unlocked evolution for this enemy
                while (enemy_data.evolution !== undefined && evolved[enemy_data.evolution]) {
                    if (enemies[enemy_data.evolution] === undefined) {
                        console.log(`Enemy evolution ${enemy_data.evolution} not found, staying with ${JSON.stringify(enemy_data)}`);
                        break;
                    }
                    else {
                        enemy_data = enemies[enemy_data.evolution];
                    }
                }
                souls += enemy_data.souls;
                coins += enemy_data.coins;
            }
        }
        const average_pattern_coins = coins / map.patterns.length;
        const average_pattern_souls = souls / map.patterns.length;
        const pattern_coins_per_second = patterns_per_second * average_pattern_coins;
        const pattern_souls_per_second = patterns_per_second * average_pattern_souls;
        //Add in the giants' average cps/sps to what we calculated
        const { giant_coins_per_second, giant_souls_per_second } = giants
            .filter((g) => g.maps.includes(map.name) && giant_bought[g.name])
            .map((g) => ({ giant_coins_per_second: giants_per_second * g.coins, giant_souls_per_second: giants_per_second * g.souls }))
            .reduce((acc, curr) => {
            acc.giant_coins_per_second += curr.giant_coins_per_second;
            acc.giant_souls_per_second += curr.giant_souls_per_second;
            return acc;
        }, { giant_coins_per_second: 0, giant_souls_per_second: 0 });
        map_active_value_result_cells[map.name].coins.innerText = String((pattern_coins_per_second + giant_coins_per_second).toFixed(2));
        map_active_value_result_cells[map.name].souls.innerText = String((pattern_souls_per_second + giant_souls_per_second).toFixed(2));
    }
    const table = (_a = document.querySelector("#mapValuesResultsTableActive")) === null || _a === void 0 ? void 0 : _a.closest("table");
    if (table !== null && table !== undefined) {
        update_table_sort(table);
    }
};
const calculate_map_values_idle = () => {
    //pattern level doesn't matter, it's all about what enemies are capable of spawning in a map
    var _a;
    for (const map of maps) {
        const map_enemies = new Set();
        let coins = 0;
        let souls = 0;
        for (const pattern of map.patterns) {
            for (const enemy_name of pattern.enemies) {
                map_enemies.add(enemy_name);
            }
        }
        for (const enemy_name of Array.from(map_enemies)) {
            let enemy_data = enemies[enemy_name];
            if (enemy_data === undefined) {
                console.log(`No enemy data found for ${enemy_name}, skipping enemy in pattern in ${map.name}`);
                continue;
            }
            //find the highest unlocked evolution for this enemy
            while (enemy_data.evolution !== undefined && evolved[enemy_data.evolution]) {
                if (enemies[enemy_data.evolution] === undefined) {
                    console.log(`Enemy evolution ${enemy_data.evolution} not found, staying with ${JSON.stringify(enemy_data)}`);
                    break;
                }
                else {
                    enemy_data = enemies[enemy_data.evolution];
                }
            }
            coins += enemy_data.coins;
            souls += enemy_data.souls;
        }
        map_idle_value_result_cells[map.name].coins.innerText = String((coins / map_enemies.size).toFixed(2));
        map_idle_value_result_cells[map.name].souls.innerText = String((souls / map_enemies.size).toFixed(2));
    }
    const table = (_a = document.querySelector("#mapValuesResultsTableIdle")) === null || _a === void 0 ? void 0 : _a.closest("table");
    if (table !== null && table !== undefined) {
        update_table_sort(table);
    }
};
const create_evolution_checkbox = (name, changeCallback) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = name.replace(/ /g, "_");
    checkbox.classList.add("bonus_checkbox");
    checkbox.addEventListener("change", changeCallback);
    const label = document.createElement("label");
    label.textContent = name;
    label.htmlFor = name;
    const container = document.createElement("li");
    container.appendChild(label);
    container.appendChild(checkbox);
    return container;
};
const find_evolution_base = (enemy_name) => {
    const enemy = enemies[enemy_name.replace(/_/g, " ")];
    if (enemy === undefined) {
        throw new Error(`Enemy ${enemy_name} is undefined! Cannot find base for this.`);
    }
    if (enemy.base) {
        return enemy;
    }
    const previous_enemy = Object.entries(enemies).find(([_, e]) => e.evolution === enemy_name.replace(/_/g, " "));
    if (previous_enemy === undefined) {
        throw new Error(`No enemy evolves into ${enemy_name}!`);
    }
    return find_evolution_base(previous_enemy[0]);
};
const on_giant_toggle = (event) => {
    const giant_name = event.currentTarget.name.replace(/_/g, " ");
    giant_bought[giant_name] = !giant_bought[giant_name];
    calculate_map_values();
};
const on_evolution_toggle = (event) => {
    const enemy_name = event.currentTarget.name.replace(/_/g, " ");
    evolved[enemy_name] = !evolved[enemy_name];
    let enemy = find_evolution_base(enemy_name);
    //make sure all evolutions are checked that are before this
    const is_checked = evolved[enemy_name];
    let enemy_encountered = false;
    do {
        if (enemy.evolution === undefined) {
            break;
        }
        if ((is_checked && !enemy_encountered) || (!is_checked && enemy_encountered)) {
            const checkbox = document.querySelector(`input[name=${enemy.evolution.replace(/ /g, "_")}]`);
            if (checkbox !== null) {
                checkbox.checked = evolved[enemy_name];
            }
            evolved[enemy.evolution] = evolved[enemy_name];
        }
        if (enemy.evolution === enemy_name) {
            enemy_encountered = true;
        }
        enemy = enemies[enemy.evolution];
        // eslint-disable-next-line no-constant-condition
    } while (true);
    calculate_map_values();
};
const change_table_sort = (event) => {
    var _a, _b;
    const header = event.currentTarget;
    const current_dir = header.classList.contains(sort_direction_to_string(SortDirection.des)) ? SortDirection.des : SortDirection.asc;
    const new_dir = current_dir === SortDirection.asc ? SortDirection.des : SortDirection.asc;
    const header_name = header.textContent;
    const all_headers = (_a = header.closest("tr")) === null || _a === void 0 ? void 0 : _a.childNodes;
    if (all_headers === undefined) {
        return;
    }
    let header_idx = -1;
    let count = 0;
    for (const header_element of all_headers) {
        if (header_element.nodeType === 1) {
            header_element.classList.remove(sort_direction_to_string(SortDirection.asc), sort_direction_to_string(SortDirection.des));
            if (header_element.textContent === header_name) {
                header_idx = count;
            }
            count++;
        }
    }
    header.classList.add(sort_direction_to_string(new_dir));
    if (header_idx === -1) {
        return;
    }
    const table = header.closest("table");
    const t_body = (_b = table === null || table === void 0 ? void 0 : table.getElementsByTagName("tbody")) === null || _b === void 0 ? void 0 : _b.item(0);
    if (t_body === null || t_body === undefined) {
        return;
    }
    sort_table_inner(t_body, header_idx, new_dir);
};
const update_table_sort = (table) => {
    //find header indicating sort
    const headers = table.querySelectorAll("th");
    let idx = 0;
    let header_idx = -1;
    let sort_dir = SortDirection.des;
    for (const header of headers) {
        if (header.nodeType === 1) {
            if (header.classList.contains(sort_direction_to_string(SortDirection.des))) {
                sort_dir = SortDirection.des;
                header_idx = idx;
                break;
            }
            if (header.classList.contains(sort_direction_to_string(SortDirection.asc))) {
                sort_dir = SortDirection.asc;
                header_idx = idx;
                break;
            }
            idx++;
        }
    }
    const t_body = table.querySelector("tbody");
    if (t_body === null || header_idx === -1) {
        return;
    }
    sort_table_inner(t_body, header_idx, sort_dir);
};
const sort_table_inner = (t_body, header_idx, dir) => {
    const rows = [];
    for (const element of t_body.childNodes) {
        if (element.nodeType == 1) {
            rows.push(element);
        }
    }
    rows.sort((a, b) => {
        const a_sort_value = Number(a.childNodes[header_idx].textContent);
        const b_sort_value = Number(b.childNodes[header_idx].textContent);
        if (!isNaN(a_sort_value) && !isNaN(b_sort_value)) {
            switch (dir) {
                case SortDirection.asc:
                    return a_sort_value - b_sort_value;
                case SortDirection.des:
                    return b_sort_value - a_sort_value;
            }
        }
        else {
            //fall back to string comparison
            const a_text = a.childNodes[header_idx].textContent;
            const b_text = b.childNodes[header_idx].textContent;
            switch (dir) {
                case SortDirection.asc:
                    if (a_text !== null && b_text !== null) {
                        return a_text.localeCompare(b_text);
                    }
                    if (a_text === null && b_text === null) {
                        return 0;
                    }
                    else if (a_text === null) {
                        return 1;
                    }
                    else {
                        return -1;
                    }
                case SortDirection.des:
                    if (a_text !== null && b_text !== null) {
                        return b_text.localeCompare(a_text);
                    }
                    if (a_text === null && b_text === null) {
                        return 0;
                    }
                    else if (a_text === null) {
                        return -1;
                    }
                    else {
                        return 1;
                    }
            }
        }
    });
    for (const row of rows) {
        t_body.appendChild(row);
    }
};
const setup_random_box_simulation = () => {
    //enumerate options
    const options_area = document.getElementById("randomBoxOptionsArea");
    const results_table = document.getElementById("randomBoxResultsTable");
    if (options_area === null || results_table === null) {
        return;
    }
    for (const bonus of random_box_bonuses) {
        if (bonus.toggleable) {
            options_area.appendChild(create_random_box_checkbox(bonus));
        }
        const result_cell = document.createElement("td");
        random_box_result_cells[bonus.name] = result_cell;
        const bonus_row = document.createElement("tr");
        const name_cell = document.createElement("td");
        name_cell.textContent = bonus.name;
        bonus_row.appendChild(name_cell);
        bonus_row.appendChild(result_cell);
        results_table.appendChild(bonus_row);
    }
    const divinity_checkbox = document.createElement("input");
    divinity_checkbox.type = "checkbox";
    divinity_checkbox.checked = random_box_reduce_found_coins;
    divinity_checkbox.addEventListener("change", () => {
        random_box_reduce_found_coins = divinity_checkbox.checked;
        get_box_probabilities();
    });
    divinity_checkbox.name = "divinity_checkbox";
    const label = document.createElement("label");
    label.textContent = "Less Coins More Fun Divinity Bought";
    label.htmlFor = "divinity_checkbox";
    const container = document.createElement("div");
    container.appendChild(label);
    container.appendChild(divinity_checkbox);
    options_area.appendChild(container);
    get_box_probabilities();
};
//todo: load random_box_bonuses from a json file
const random_box_bonuses = [
    {
        chance: 1,
        name: "Found Coins",
        toggleable: false,
    },
    {
        chance: 0.3,
        name: "Frenzy",
        toggleable: false,
    },
    {
        chance: 0.04,
        name: "Equipment Bonus",
        toggleable: false,
    },
    {
        chance: 0.01,
        name: "OMG",
        toggleable: false,
    },
    {
        chance: 0.05,
        name: "Coin Value",
        toggleable: false,
    },
    {
        chance: 0.1,
        name: "Dual Randomness",
        toggleable: true,
    },
    {
        chance: 0.12,
        name: "Gemstone Rush",
        toggleable: true,
    },
    {
        chance: 0.2,
        name: "CpS Multiplier",
        toggleable: false,
    },
    {
        chance: 0.25,
        name: "Horde",
        toggleable: true,
    },
    {
        chance: 0.12,
        name: "Increase Souls",
        toggleable: true,
    },
];
let random_box_reduce_found_coins = false;
//map from bonus name to toggled state, if toggleable
const toggled = random_box_bonuses
    .filter((b) => b.toggleable)
    .reduce((accumulator, curr) => {
    accumulator[curr.name] = false;
    return accumulator;
}, {});
const create_random_box_checkbox = (bonus) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = bonus.name;
    checkbox.classList.add("bonus_checkbox");
    checkbox.addEventListener("change", on_bonus_toggle);
    const label = document.createElement("label");
    label.textContent = bonus.name;
    if (bonus.name === "Horde") {
        label.textContent = "Map has flying enemies, or you have Mega Horde";
    }
    label.htmlFor = bonus.name;
    const container = document.createElement("div");
    container.appendChild(label);
    container.appendChild(checkbox);
    return container;
};
/** map of bonus name to its result cell */
const random_box_result_cells = {};
/**
 * Called on a bonus's checkbox being changed
 * @param event
 */
const on_bonus_toggle = (event) => {
    const bonus_name = event.currentTarget.name;
    if (toggled[bonus_name] === undefined) {
        toggled[bonus_name] = true;
    }
    else {
        toggled[bonus_name] = !toggled[bonus_name];
    }
    get_box_probabilities();
};
const sort_random_box_table = () => {
    const table = document.getElementById("randomBoxResultsTable");
    if (table === null) {
        return;
    }
    const store = [];
    for (let i = 0, len = table.rows.length; i < len; i++) {
        const row = table.rows[i];
        if (row.cells[1].textContent === null) {
            continue;
        }
        const sort_value = parseFloat(row.cells[1].textContent);
        store.push([sort_value, row]);
    }
    store.sort((a, b) => b[0] - a[0]);
    for (const [_, row] of store) {
        table.appendChild(row);
    }
};
/**
 * Credit to Scion#7777 from the IdleSlayer discord for this
 */
class Distribution {
    constructor() {
        this.dist = {};
        this.empty = 1;
        for (const box of random_box_bonuses) {
            this.dist[box.name] = 0;
        }
        this.update();
    }
    update() {
        this.empty = 1;
        for (const box of random_box_bonuses) {
            this.empty -= this.dist[box.name];
        }
    }
    add(other) {
        for (const box of random_box_bonuses) {
            this.dist[box.name] += other.dist[box.name];
        }
    }
    divide(scalar) {
        for (const box of random_box_bonuses) {
            this.dist[box.name] /= scalar;
        }
    }
    normalize() {
        this.divide(1 - this.empty);
    }
}
let distribution_cache = {};
/**
 * Calculate the distribution of bonuses from the random box.
 *
 * Credit to Scion#7777 from the IdleSlayer discord for this
 */
const calculate_distribution = (box_set) => {
    const set_names = box_set.map((box) => box.name).join("");
    if (distribution_cache[set_names] != undefined) {
        return distribution_cache[set_names];
    }
    const new_dist = new Distribution();
    // 1. If set has only 1 element, calculate it.
    if (box_set.length === 1) {
        for (const out of box_set) {
            new_dist.dist[out.name] = out.chance;
            new_dist.update();
        }
        distribution_cache[set_names] = new_dist;
        return new_dist;
    }
    // 2. Otherwise, calculate it in function of the subsets
    //
    // Idea: take each element, pretend it's the last one in the shuffle.
    // The resulting distribution is the same as that of the reduced set, except
    // probability of the last element is its base probability * reduced.empty.
    //
    // Calculating the average after making each element of the set be the last
    // gives the final distribution.
    for (const [last_idx, last] of box_set.entries()) {
        const reduced_set = [...box_set];
        reduced_set.splice(last_idx, 1);
        const reduced = calculate_distribution(reduced_set);
        new_dist.add(reduced);
        new_dist.dist[last.name] += last.chance * reduced.empty;
    }
    new_dist.divide(box_set.length);
    new_dist.update();
    distribution_cache[set_names] = new_dist;
    return new_dist;
};
/**
 * Get the probabilities of getting random boxes, and update the table with the probabilities.
 */
const get_box_probabilities = () => {
    const filtered_boxes = random_box_bonuses.filter((bonus) => toggled[bonus.name] === undefined || toggled[bonus.name]);
    const idx = filtered_boxes.findIndex((box) => box.name === "Found Coins");
    if (random_box_reduce_found_coins) {
        filtered_boxes[idx].chance = 0.9;
    }
    else {
        filtered_boxes[idx].chance = 1;
    }
    const distribution = calculate_distribution(filtered_boxes);
    distribution.normalize();
    for (const [key, probability] of Object.entries(distribution.dist)) {
        random_box_result_cells[key].textContent = `${(probability * 100).toFixed(2)}%`;
    }
    //clear cache
    distribution_cache = {};
    sort_random_box_table();
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jYWxjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxJQUFLLGFBR0o7QUFIRCxXQUFLLGFBQWE7SUFDakIsK0NBQUcsQ0FBQTtJQUNILCtDQUFHLENBQUE7QUFDSixDQUFDLEVBSEksYUFBYSxLQUFiLGFBQWEsUUFHakI7QUFFRCxNQUFNLHdCQUF3QixHQUFHLENBQUMsR0FBa0IsRUFBaUIsRUFBRTtJQUN0RSxRQUFRLEdBQUcsRUFBRTtRQUNaLEtBQUssYUFBYSxDQUFDLEdBQUc7WUFDckIsT0FBTyxLQUFLLENBQUM7UUFDZCxLQUFLLGFBQWEsQ0FBQyxHQUFHO1lBQ3JCLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDRixDQUFDLENBQUM7QUFFRixRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQ2xELDJCQUEyQixFQUFFLENBQUM7SUFDOUIsS0FBSyxvQkFBb0IsRUFBRSxDQUFDO0lBQzVCLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2hFLEtBQUssTUFBTSxNQUFNLElBQUksZ0JBQWdCLEVBQUU7UUFDdEMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0tBQ3BEO0FBQ0YsQ0FBQyxDQUFDLENBQUM7QUFFSCxNQUFNLFNBQVMsR0FBRyxDQUFJLEdBQVcsRUFBYyxFQUFFO0lBQ2hELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUM5QixNQUFNLEdBQUcsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ2pDLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxHQUFHLEVBQUU7WUFDN0IsSUFBSSxHQUFHLENBQUMsVUFBVSxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRTtnQkFDL0MsT0FB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