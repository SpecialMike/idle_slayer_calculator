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
const map_value_result_cells = {};
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
    const results_table = document.getElementById("mapValuesResultsTable");
    if (options_area === null || evolutions_list === null || results_table === null) {
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
    for (const map of maps) {
        const coins = document.createElement("td");
        const souls = document.createElement("td");
        map_value_result_cells[map.name] = { coins, souls };
        const bonus_row = document.createElement("tr");
        const name_cell = document.createElement("td");
        name_cell.textContent = map.name;
        bonus_row.appendChild(name_cell);
        bonus_row.appendChild(coins);
        bonus_row.appendChild(souls);
        results_table.appendChild(bonus_row);
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
        map_value_result_cells[map.name].coins.innerText = String((coins / map.patterns.length).toFixed(2));
        map_value_result_cells[map.name].souls.innerText = String((souls / map.patterns.length).toFixed(2));
    }
    const table = (_a = document.querySelector("#mapValuesResultsTable")) === null || _a === void 0 ? void 0 : _a.closest("table");
    if (table !== null && table !== undefined) {
        update_table_sort(table);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jYWxjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxJQUFLLGFBR0o7QUFIRCxXQUFLLGFBQWE7SUFDakIsK0NBQUcsQ0FBQTtJQUNILCtDQUFHLENBQUE7QUFDSixDQUFDLEVBSEksYUFBYSxLQUFiLGFBQWEsUUFHakI7QUFFRCxNQUFNLHdCQUF3QixHQUFHLENBQUMsR0FBa0IsRUFBaUIsRUFBRTtJQUN0RSxRQUFRLEdBQUcsRUFBRTtRQUNaLEtBQUssYUFBYSxDQUFDLEdBQUc7WUFDckIsT0FBTyxLQUFLLENBQUM7UUFDZCxLQUFLLGFBQWEsQ0FBQyxHQUFHO1lBQ3JCLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDRixDQUFDLENBQUM7QUFFRixRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQ2xELDJCQUEyQixFQUFFLENBQUM7SUFDOUIsS0FBSyxvQkFBb0IsRUFBRSxDQUFDO0lBQzVCLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2hFLEtBQUssTUFBTSxNQUFNLElBQUksZ0JBQWdCLEVBQUU7UUFDdEMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0tBQ3BEO0FBQ0YsQ0FBQyxDQUFDLENBQUM7QUFFSCxNQUFNLFNBQVMsR0FBRyxDQUFJLEdBQVcsRUFBYyxFQUFFO0lBQ2hELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUM5QixNQUFNLEdBQUcsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ2pDLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxHQUFHLEVBQUU7WUFDN0IsSUFBSSxHQUFHLENBQUMsVUFBVSxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRTtnQkFDL0MsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBTSxDQUFDLENBQUM7YUFDM0M7UUFDRixDQUFDLENBQUM7UUFDRixHQUFHLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN6QyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxnQkFBZ0IsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0MsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ1osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUM7QUFtQkYsTUFBTSxZQUFZLEdBQWlCLEVBQUUsQ0FBQztBQUN0QyxJQUFJLE9BQU8sR0FBMEIsRUFBRSxDQUFDO0FBQ3hDLElBQUksSUFBSSxHQUF5QixFQUFFLENBQUM7QUFDcEMsTUFBTSxzQkFBc0IsR0FBaUYsRUFBRSxDQUFDO0FBQ2hILElBQUksbUJBQW1CLEdBQTRCLElBQUksQ0FBQztBQUN4RCxNQUFNLE9BQU8sR0FBNEIsRUFBRSxDQUFDO0FBQzVDLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDO0FBRTVCLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxJQUFtQixFQUFFO0lBQ3RELE9BQU8sR0FBRyxNQUFNLFNBQVMsQ0FBd0IsY0FBYyxDQUFDLENBQUM7SUFDakUsSUFBSSxHQUFHLE1BQU0sU0FBUyxDQUF1QixXQUFXLENBQUMsQ0FBQztJQUMxRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLGFBQWEsQ0FBQyxDQUFDO0lBQ3BFLElBQUksV0FBVyxLQUFLLENBQUMsQ0FBQyxFQUFFO1FBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQzVCO0lBQ0QsT0FBTyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDOUIsT0FBTyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNqQyxPQUFPLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3BDLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUNwRSxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDMUUsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQ3ZFLElBQUksWUFBWSxLQUFLLElBQUksSUFBSSxlQUFlLEtBQUssSUFBSSxJQUFJLGFBQWEsS0FBSyxJQUFJLEVBQUU7UUFDaEYsT0FBTztLQUNQO0lBQ0QsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDcEQsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFO1lBQ2YsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO1lBQzFCLEdBQUc7Z0JBQ0YsSUFBSSxhQUFhLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRTtvQkFDMUMsTUFBTTtpQkFDTjtnQkFDRCxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDO2dCQUM3QyxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDakQsZUFBZSxDQUFDLFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2FBQ3JFLFFBQVEsYUFBYSxLQUFLLFNBQVMsRUFBRTtZQUN0QyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3pCO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztLQUN0QjtJQUNELEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFO1FBQ3ZCLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0MsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDcEQsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQyxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9DLFNBQVMsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztRQUNqQyxTQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pDLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0IsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QixhQUFhLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ3JDO0lBRUQsbUJBQW1CLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQzVFLElBQUksbUJBQW1CLEtBQUssSUFBSSxFQUFFO1FBQ2pDLG1CQUFtQixDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEMsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtZQUNuRCxJQUFJLG1CQUFtQixLQUFLLElBQUksRUFBRTtnQkFDakMsTUFBTSwyQkFBMkIsR0FBRyxNQUFNLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3RFLElBQUksS0FBSyxDQUFDLDJCQUEyQixDQUFDLEVBQUU7b0JBQ3ZDLG1CQUFtQixDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztpQkFDdEQ7Z0JBQ0QsSUFBSSwyQkFBMkIsR0FBRyxpQkFBaUIsRUFBRTtvQkFDcEQsbUJBQW1CLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2lCQUN0RDtxQkFDSSxJQUFJLDJCQUEyQixHQUFHLGlCQUFpQixFQUFFO29CQUN6RCxtQkFBbUIsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7aUJBQ3REO2FBQ0Q7WUFDRCxvQkFBb0IsRUFBRSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxDQUFDO0tBQ0g7SUFDRCxvQkFBb0IsRUFBRSxDQUFDO0FBQ3hCLENBQUMsQ0FBQztBQUVGLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxFQUFFOztJQUNqQyxJQUFJLG1CQUFtQixLQUFLLElBQUksRUFBRTtRQUNqQyxPQUFPO0tBQ1A7SUFDRCxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEQsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUU7UUFDdkIsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsS0FBSyxNQUFNLE9BQU8sSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFO1lBQ25DLElBQUksT0FBTyxDQUFDLEtBQUssR0FBRyxhQUFhLEVBQUU7Z0JBQ2xDLFNBQVM7YUFDVDtZQUNELEtBQUssTUFBTSxVQUFVLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtnQkFDekMsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUU7b0JBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLFVBQVUsa0NBQWtDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO29CQUMvRixTQUFTO2lCQUNUO2dCQUNELG9EQUFvRDtnQkFDcEQsT0FBTyxVQUFVLENBQUMsU0FBUyxLQUFLLFNBQVMsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFO29CQUMzRSxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEtBQUssU0FBUyxFQUFFO3dCQUNoRCxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixVQUFVLENBQUMsU0FBUyw0QkFBNEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQzdHLE1BQU07cUJBQ047eUJBQ0k7d0JBQ0osVUFBVSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7cUJBQzNDO2lCQUNEO2dCQUNELEtBQUssSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDO2dCQUMxQixLQUFLLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQzthQUMxQjtTQUNEO1FBQ0Qsc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEcsc0JBQXNCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDcEc7SUFDRCxNQUFNLEtBQUssU0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDBDQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqRixJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtRQUMxQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUN6QjtBQUNGLENBQUMsQ0FBQztBQUVGLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtJQUNsRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pELFFBQVEsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO0lBQzNCLFFBQVEsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDeEMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN6QyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDekQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5QyxLQUFLLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztJQUN6QixLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztJQUNyQixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9DLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0IsU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoQyxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDLENBQUM7QUFFRixNQUFNLG1CQUFtQixHQUFHLENBQUMsVUFBa0IsRUFBUyxFQUFFO0lBQ3pELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JELElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtRQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsVUFBVSwyQ0FBMkMsQ0FBQyxDQUFDO0tBQ2hGO0lBQ0QsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFO1FBQ2YsT0FBTyxLQUFLLENBQUM7S0FDYjtJQUNELE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEtBQUssVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMvRyxJQUFJLGNBQWMsS0FBSyxTQUFTLEVBQUU7UUFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsVUFBVSxHQUFHLENBQUMsQ0FBQztLQUN4RDtJQUNELE9BQU8sbUJBQW1CLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDO0FBRUYsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLEtBQVksRUFBRSxFQUFFO0lBQzVDLE1BQU0sVUFBVSxHQUFJLEtBQUssQ0FBQyxhQUFrQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3JGLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUMzQyxJQUFJLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1QywyREFBMkQ7SUFDM0QsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZDLElBQUksaUJBQWlCLEdBQUcsS0FBSyxDQUFDO0lBQzlCLEdBQUc7UUFDRixJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssU0FBUyxFQUFFO1lBQ2xDLE1BQU07U0FDTjtRQUNELElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLElBQUksaUJBQWlCLENBQUMsRUFBRTtZQUM3RSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLGNBQWMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQXFCLENBQUM7WUFDakgsSUFBSSxRQUFRLEtBQUssSUFBSSxFQUFFO2dCQUN0QixRQUFRLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUN2QztZQUNELE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQy9DO1FBRUQsSUFBSSxLQUFLLENBQUMsU0FBUyxLQUFLLFVBQVUsRUFBRTtZQUNuQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7U0FDekI7UUFDRCxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqQyxpREFBaUQ7S0FDakQsUUFBUSxJQUFJLEVBQUU7SUFDZixvQkFBb0IsRUFBRSxDQUFDO0FBQ3hCLENBQUMsQ0FBQztBQUVGLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxLQUFZLEVBQUUsRUFBRTs7SUFDMUMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGFBQTRCLENBQUM7SUFDbEQsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUM7SUFDbkksTUFBTSxPQUFPLEdBQUcsV0FBVyxLQUFLLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUM7SUFDMUYsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQztJQUN2QyxNQUFNLFdBQVcsU0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQywwQ0FBRSxVQUFVLENBQUM7SUFDckQsSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFO1FBQzlCLE9BQU87S0FDUDtJQUNELElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNkLEtBQUssTUFBTSxjQUFjLElBQUksV0FBVyxFQUFFO1FBQ3pDLElBQUksY0FBYyxDQUFDLFFBQVEsS0FBSyxDQUFDLEVBQUU7WUFDakMsY0FBOEIsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSx3QkFBd0IsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMzSSxJQUFJLGNBQWMsQ0FBQyxXQUFXLEtBQUssV0FBVyxFQUFFO2dCQUMvQyxVQUFVLEdBQUcsS0FBSyxDQUFDO2FBQ25CO1lBQ0QsS0FBSyxFQUFFLENBQUM7U0FDUjtLQUNEO0lBQ0QsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN4RCxJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsRUFBRTtRQUN0QixPQUFPO0tBQ1A7SUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sTUFBTSxlQUFHLEtBQUssMENBQUUsb0JBQW9CLENBQUMsT0FBTywyQ0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0QsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7UUFDNUMsT0FBTztLQUNQO0lBQ0QsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUM7QUFFRixNQUFNLGlCQUFpQixHQUFHLENBQUMsS0FBa0IsRUFBRSxFQUFFO0lBQ2hELDZCQUE2QjtJQUM3QixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDN0MsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQ1osSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDcEIsSUFBSSxRQUFRLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQztJQUNqQyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtRQUM3QixJQUFJLE1BQU0sQ0FBQyxRQUFRLEtBQUssQ0FBQyxFQUFFO1lBQzFCLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7Z0JBQzNFLFFBQVEsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDO2dCQUM3QixVQUFVLEdBQUcsR0FBRyxDQUFDO2dCQUNqQixNQUFNO2FBQ047WUFDRCxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO2dCQUMzRSxRQUFRLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQztnQkFDN0IsVUFBVSxHQUFHLEdBQUcsQ0FBQztnQkFDakIsTUFBTTthQUNOO1lBQ0QsR0FBRyxFQUFFLENBQUM7U0FDTjtLQUNEO0lBQ0QsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM1QyxJQUFJLE1BQU0sS0FBSyxJQUFJLElBQUksVUFBVSxLQUFLLENBQUMsQ0FBQyxFQUFFO1FBQ3pDLE9BQU87S0FDUDtJQUNELGdCQUFnQixDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDO0FBRUYsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLE1BQW1CLEVBQUUsVUFBa0IsRUFBRSxHQUFrQixFQUFFLEVBQUU7SUFDeEYsTUFBTSxJQUFJLEdBQStCLEVBQUUsQ0FBQztJQUM1QyxLQUFLLE1BQU0sT0FBTyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUU7UUFDeEMsSUFBSSxPQUFPLENBQUMsUUFBUSxJQUFJLENBQUMsRUFBRTtZQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQThCLENBQUMsQ0FBQztTQUMxQztLQUNEO0lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNsQixNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNsRSxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQ2pELFFBQVEsR0FBRyxFQUFFO2dCQUNaLEtBQUssYUFBYSxDQUFDLEdBQUc7b0JBQ3JCLE9BQU8sWUFBWSxHQUFHLFlBQVksQ0FBQztnQkFDcEMsS0FBSyxhQUFhLENBQUMsR0FBRztvQkFDckIsT0FBTyxZQUFZLEdBQUcsWUFBWSxDQUFDO2FBQ3BDO1NBQ0Q7YUFDSTtZQUNKLGdDQUFnQztZQUNoQyxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFdBQVcsQ0FBQztZQUNwRCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFdBQVcsQ0FBQztZQUNwRCxRQUFRLEdBQUcsRUFBRTtnQkFDWixLQUFLLGFBQWEsQ0FBQyxHQUFHO29CQUNyQixJQUFJLE1BQU0sS0FBSyxJQUFJLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTt3QkFDdkMsT0FBTyxNQUFNLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO3FCQUNwQztvQkFDRCxJQUFJLE1BQU0sS0FBSyxJQUFJLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTt3QkFDdkMsT0FBTyxDQUFDLENBQUM7cUJBQ1Q7eUJBQ0ksSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO3dCQUN6QixPQUFPLENBQUMsQ0FBQztxQkFDVDt5QkFDSTt3QkFDSixPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUNWO2dCQUNGLEtBQUssYUFBYSxDQUFDLEdBQUc7b0JBQ3JCLElBQUksTUFBTSxLQUFLLElBQUksSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO3dCQUN2QyxPQUFPLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7cUJBQ3BDO29CQUNELElBQUksTUFBTSxLQUFLLElBQUksSUFBSSxNQUFNLEtBQUssSUFBSSxFQUFFO3dCQUN2QyxPQUFPLENBQUMsQ0FBQztxQkFDVDt5QkFDSSxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7d0JBQ3pCLE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ1Y7eUJBQ0k7d0JBQ0osT0FBTyxDQUFDLENBQUM7cUJBQ1Q7YUFDRjtTQUNEO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTtRQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3hCO0FBQ0YsQ0FBQyxDQUFDO0FBRUYsTUFBTSwyQkFBMkIsR0FBRyxHQUFHLEVBQUU7SUFDeEMsbUJBQW1CO0lBQ25CLE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUNyRSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDdkUsSUFBSSxZQUFZLEtBQUssSUFBSSxJQUFJLGFBQWEsS0FBSyxJQUFJLEVBQUU7UUFDcEQsT0FBTztLQUNQO0lBQ0QsS0FBSyxNQUFNLEtBQUssSUFBSSxrQkFBa0IsRUFBRTtRQUN2QyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUU7WUFDckIsWUFBWSxDQUFDLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQzVEO1FBQ0QsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRCx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDO1FBQ2xELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0MsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQyxTQUFTLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDbkMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqQyxTQUFTLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ25DLGFBQWEsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDckM7SUFDRCxjQUFjLEVBQUUsQ0FBQztBQUNsQixDQUFDLENBQUM7QUFFRixnREFBZ0Q7QUFDaEQsTUFBTSxrQkFBa0IsR0FBRztJQUMxQjtRQUNDLE1BQU0sRUFBRSxDQUFDO1FBQ1QsSUFBSSxFQUFFLGFBQWE7UUFDbkIsVUFBVSxFQUFFLEtBQUs7S0FDakI7SUFDRDtRQUNDLE1BQU0sRUFBRSxHQUFHO1FBQ1gsSUFBSSxFQUFFLFFBQVE7UUFDZCxVQUFVLEVBQUUsS0FBSztLQUNqQjtJQUNEO1FBQ0MsTUFBTSxFQUFFLElBQUk7UUFDWixJQUFJLEVBQUUsaUJBQWlCO1FBQ3ZCLFVBQVUsRUFBRSxLQUFLO0tBQ2pCO0lBQ0Q7UUFDQyxNQUFNLEVBQUUsSUFBSTtRQUNaLElBQUksRUFBRSxLQUFLO1FBQ1gsVUFBVSxFQUFFLEtBQUs7S0FDakI7SUFDRDtRQUNDLE1BQU0sRUFBRSxJQUFJO1FBQ1osSUFBSSxFQUFFLFlBQVk7UUFDbEIsVUFBVSxFQUFFLEtBQUs7S0FDakI7SUFDRDtRQUNDLE1BQU0sRUFBRSxHQUFHO1FBQ1gsSUFBSSxFQUFFLGlCQUFpQjtRQUN2QixVQUFVLEVBQUUsSUFBSTtLQUNoQjtJQUNEO1FBQ0MsTUFBTSxFQUFFLElBQUk7UUFDWixJQUFJLEVBQUUsZUFBZTtRQUNyQixVQUFVLEVBQUUsSUFBSTtLQUNoQjtJQUNEO1FBQ0MsTUFBTSxFQUFFLEdBQUc7UUFDWCxJQUFJLEVBQUUsZ0JBQWdCO1FBQ3RCLFVBQVUsRUFBRSxLQUFLO0tBQ2pCO0lBQ0Q7UUFDQyxNQUFNLEVBQUUsSUFBSTtRQUNaLElBQUksRUFBRSxPQUFPO1FBQ2IsVUFBVSxFQUFFLElBQUk7S0FDaEI7SUFDRDtRQUNDLE1BQU0sRUFBRSxJQUFJO1FBQ1osSUFBSSxFQUFFLGdCQUFnQjtRQUN0QixVQUFVLEVBQUUsSUFBSTtLQUNoQjtDQUNELENBQUM7QUFRRixxREFBcUQ7QUFDckQsTUFBTSxPQUFPLEdBQTRCLGtCQUFrQjtLQUN6RCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7S0FDM0IsTUFBTSxDQUEwQixDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsRUFBRTtJQUN0RCxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztJQUMvQixPQUFPLFdBQVcsQ0FBQztBQUNwQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDUixNQUFNLDBCQUEwQixHQUFHLENBQUMsS0FBWSxFQUFFLEVBQUU7SUFDbkQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqRCxRQUFRLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztJQUMzQixRQUFRLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDM0IsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUN6QyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBQ3JELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQy9CLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUU7UUFDM0IsS0FBSyxDQUFDLFdBQVcsR0FBRyxnREFBZ0QsQ0FBQztLQUNyRTtJQUNELEtBQUssQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztJQUMzQixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hELFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0IsU0FBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNoQyxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDLENBQUM7QUFFRiwyQ0FBMkM7QUFDM0MsTUFBTSx1QkFBdUIsR0FBeUMsRUFBRSxDQUFDO0FBRXpFOzs7R0FHRztBQUNILE1BQU0sZUFBZSxHQUFHLENBQUMsS0FBWSxFQUFFLEVBQUU7SUFDeEMsTUFBTSxVQUFVLEdBQUksS0FBSyxDQUFDLGFBQWtDLENBQUMsSUFBSSxDQUFDO0lBQ2xFLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLFNBQVMsRUFBRTtRQUN0QyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsSUFBSSxDQUFDO0tBQzNCO1NBQ0k7UUFDSixPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7S0FDM0M7SUFDRCxjQUFjLEVBQUUsQ0FBQztBQUNsQixDQUFDLENBQUM7QUFFRixNQUFNLHFCQUFxQixHQUFHLEdBQUcsRUFBRTtJQUNsQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFxQixDQUFDO0lBQ25GLElBQUksS0FBSyxLQUFLLElBQUksRUFBRTtRQUNuQixPQUFPO0tBQ1A7SUFDRCxNQUFNLEtBQUssR0FBeUMsRUFBRSxDQUFDO0lBQ3ZELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ3RELE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsS0FBSyxJQUFJLEVBQUU7WUFDdEMsU0FBUztTQUNUO1FBQ0QsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDeEQsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQzlCO0lBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksS0FBSyxFQUFFO1FBQzdCLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDdkI7QUFDRixDQUFDLENBQUM7QUFDRjs7R0FFRztBQUNILE1BQU0sY0FBYyxHQUFHLEdBQUcsRUFBRTtJQUMzQixNQUFNLFdBQVcsR0FBMkIsRUFBRSxDQUFDO0lBQy9DLEtBQUssTUFBTSxZQUFZLElBQUksa0JBQWtCLEVBQUU7UUFDOUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDbkM7SUFDRCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUM7SUFDMUIsS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFVBQVUsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUMxQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0tBQzFDO0lBQ0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFO1FBQzNDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7S0FDcEc7SUFDRCxxQkFBcUIsRUFBRSxDQUFDO0FBQ3pCLENBQUMsQ0FBQztBQUNGOzs7R0FHRztBQUNILE1BQU0sYUFBYSxHQUFHLENBQUksS0FBZSxFQUFFLEVBQUU7SUFDNUMsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFDL0IsVUFBVSxFQUNWLFlBQVksQ0FBQztJQUNkLDRDQUE0QztJQUM1QyxPQUFPLENBQUMsS0FBSyxhQUFhLEVBQUU7UUFDM0IsOEJBQThCO1FBQzlCLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxhQUFhLENBQUMsQ0FBQztRQUN6RCxhQUFhLElBQUksQ0FBQyxDQUFDO1FBQ25CLHdDQUF3QztRQUN4QyxVQUFVLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2xDLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDM0MsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLFVBQVUsQ0FBQztLQUNqQztJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBQ0Y7Ozs7R0FJRztBQUNILE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxFQUFFO0lBQ2hDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQztJQUNmLEdBQUc7UUFDRixhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNsQyxLQUFLLE1BQU0sWUFBWSxJQUFJLGtCQUFrQixFQUFFO1lBQzlDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM3QixJQUFJLE1BQU0sSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFO2dCQUNsQyxHQUFHLEdBQUcsWUFBWSxDQUFDO2FBQ25CO1NBQ0Q7S0FDRCxRQUFRLEdBQUcsS0FBSyxJQUFJLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxTQUFTLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO0lBQ2hGLHVJQUF1STtJQUN2SSxvRUFBb0U7SUFDcEUsT0FBTyxHQUFJLENBQUM7QUFDYixDQUFDLENBQUMifQ==