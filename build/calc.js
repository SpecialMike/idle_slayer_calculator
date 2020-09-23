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
const map_active_value_result_cells = {};
const map_idle_value_result_cells = {};
let pattern_level_input = null;
const evolved = {};
const MAX_PATTERN_LEVEL = 3;
const MIN_PATTERN_LEVEL = 1;
const setup_map_value_area = async () => {
    enemies = await load_json("enemies.json");
    maps = await load_json("maps.json");
    const bonus_index = maps.findIndex((m) => m.name === "Bonus Stage");
    if (bonus_index !== -1) {
        maps.splice(bonus_index, 1);
    }
    delete enemies["Soul Goblin"];
    delete enemies["Soul Hobgoblin"];
    delete enemies["Soul Goblin Chief"];
    const options_area = document.getElementById("mapValueOptionsArea");
    const evolutions_list = document.getElementById("mapValueEvolutionsList");
    const active_results_table = document.getElementById("mapValuesResultsTableActive");
    const idle_results_table = document.getElementById("mapValuesResultsTableIdle");
    if (options_area === null || evolutions_list === null || active_results_table === null || idle_results_table === null) {
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
                evolutions_list.appendChild(create_evolution_checkbox(evolved_name));
            } while (evolved_enemy !== undefined);
            base_enemies.push(enemy);
        }
        evolved[name] = false;
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
        map_active_value_result_cells[map.name].coins.innerText = String((coins / map.patterns.length).toFixed(2));
        map_active_value_result_cells[map.name].souls.innerText = String((souls / map.patterns.length).toFixed(2));
    }
    const table = (_a = document.querySelector("#mapValuesResultsTableActive")) === null || _a === void 0 ? void 0 : _a.closest("table");
    if (table !== null && table !== undefined) {
        update_table_sort(table);
    }
};
const calculate_map_values_idle = () => {
    //pattern level doesn't matter, it's all about what enemies are capable of spawning in a map
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
};
const create_evolution_checkbox = (name) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = name.replace(/ /g, "_");
    checkbox.classList.add("bonus_checkbox");
    checkbox.addEventListener("change", on_evolution_toggle);
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
    var _a, _b, _c;
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
    const t_body = (_c = (_b = table) === null || _b === void 0 ? void 0 : _b.getElementsByTagName("tbody")) === null || _c === void 0 ? void 0 : _c.item(0);
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
    run_simulation();
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
    run_simulation();
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
 * Run the simulation. Chooses a random bonus `num_rounds` times and then puts the results in the table
 */
const run_simulation = () => {
    const num_success = {};
    for (const random_bonus of random_box_bonuses) {
        num_success[random_bonus.name] = 0;
    }
    const num_rounds = 100000;
    for (let run = 0; run < num_rounds; run++) {
        num_success[select_random_bonus().name]++;
    }
    for (const key of Object.keys(num_success)) {
        random_box_result_cells[key].textContent = `${((num_success[key] / num_rounds) * 100).toFixed(2)}%`;
    }
    sort_random_box_table();
};
/**
 * Shuffle the array in place, to pick from later
 * @param {Array<T>} array Array to shuffle
 */
const shuffle_array = (array) => {
    let current_index = array.length, temp_value, random_index;
    // While there remain elements to shuffle...
    while (0 !== current_index) {
        // Pick a remaining element...
        random_index = Math.floor(Math.random() * current_index);
        current_index -= 1;
        // And swap it with the current element.
        temp_value = array[current_index];
        array[current_index] = array[random_index];
        array[random_index] = temp_value;
    }
    return array;
};
/**
 * Selects a random bonus according to the algorithm described by plab
 * Shuffles the array, and then goes down the list, attempting to choose each event
 * An event passes if it is toggled and if its chances pass
 */
const select_random_bonus = () => {
    let evt = null;
    do {
        shuffle_array(random_box_bonuses);
        for (const random_bonus of random_box_bonuses) {
            const chance = Math.random();
            if (chance <= random_bonus.chance) {
                evt = random_bonus;
            }
        }
    } while (evt !== null && toggled[evt.name] !== undefined && !toggled[evt.name]);
    //disabled warning because we don't break from the loop until it is not null... we could have an infinite loop here technically :shrug:
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return evt;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jYWxjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxJQUFLLGFBR0o7QUFIRCxXQUFLLGFBQWE7SUFDakIsK0NBQUcsQ0FBQTtJQUNILCtDQUFHLENBQUE7QUFDSixDQUFDLEVBSEksYUFBYSxLQUFiLGFBQWEsUUFHakI7QUFFRCxNQUFNLHdCQUF3QixHQUFHLENBQUMsR0FBa0IsRUFBaUIsRUFBRTtJQUN0RSxRQUFRLEdBQUcsRUFBRTtRQUNaLEtBQUssYUFBYSxDQUFDLEdBQUc7WUFDckIsT0FBTyxLQUFLLENBQUM7UUFDZCxLQUFLLGFBQWEsQ0FBQyxHQUFHO1lBQ3JCLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDRixDQUFDLENBQUM7QUFFRixRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQ2xELDJCQUEyQixFQUFFLENBQUM7SUFDOUIsS0FBSyxvQkFBb0IsRUFBRSxDQUFDO0lBQzVCLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2hFLEtBQUssTUFBTSxNQUFNLElBQUksZ0JBQWdCLEVBQUU7UUFDdEMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0tBQ3BEO0FBQ0YsQ0FBQyxDQUFDLENBQUM7QUFFSCxNQUFNLFNBQVMsR0FBRyxDQUFJLEdBQVcsRUFBYyxFQUFFO0lBQ2hELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUM5QixNQUFNLEdBQUcsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ2pDLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxHQUFHLEVBQUU7WUFDN0IsSUFBSSxHQUFHLENBQUMsVUFBVSxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRTtnQkFDL0MsT0FB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