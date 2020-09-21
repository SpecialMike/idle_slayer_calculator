"use strict";
document.addEventListener("DOMContentLoaded", function () {
    setup_random_box_simulation();
});
var setup_random_box_simulation = function () {
    //enumerate options
    var options_area = document.getElementById("randomBoxOptionsArea");
    var results_table = document.getElementById("randomBoxResultsTable");
    if (options_area === null || results_table === null) {
        return;
    }
    for (var _i = 0, random_box_bonuses_1 = random_box_bonuses; _i < random_box_bonuses_1.length; _i++) {
        var bonus = random_box_bonuses_1[_i];
        if (bonus.toggleable) {
            options_area.appendChild(create_checkbox(bonus));
        }
        var result_cell = document.createElement("td");
        result_cells[bonus.name] = result_cell;
        var bonus_row = document.createElement("tr");
        var name_cell = document.createElement("td");
        name_cell.textContent = bonus.name;
        bonus_row.appendChild(name_cell);
        bonus_row.appendChild(result_cell);
        results_table.appendChild(bonus_row);
    }
    run_simulation();
};
//todo: load random_box_bonuses from a json file
var random_box_bonuses = [
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
var toggled = random_box_bonuses
    .filter(function (b) { return b.toggleable; })
    .reduce(function (accumulator, curr) {
    accumulator[curr.name] = false;
    return accumulator;
}, {});
var create_checkbox = function (bonus) {
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = bonus.name;
    checkbox.classList.add("bonus_checkbox");
    checkbox.addEventListener("change", on_bonus_toggle);
    var label = document.createElement("label");
    label.textContent = bonus.name;
    if (bonus.name === "Horde") {
        label.textContent = "Map has flying enemies, or you have Mega Horde";
    }
    label.htmlFor = bonus.name;
    var container = document.createElement("div");
    container.appendChild(label);
    container.appendChild(checkbox);
    return container;
};
/** map of bonus name to its result cell */
var result_cells = {};
/**
 * Called on a bonus's checkbox being changed
 * @param event
 */
var on_bonus_toggle = function (event) {
    var bonus_name = event.currentTarget.name;
    if (toggled[bonus_name] === undefined) {
        toggled[bonus_name] = true;
    }
    else {
        toggled[bonus_name] = !toggled[bonus_name];
    }
    run_simulation();
};
var sort_table = function () {
    var table = document.getElementById("resultsTable");
    if (table === null) {
        return;
    }
    var store = [];
    for (var i = 0, len = table.rows.length; i < len; i++) {
        var row = table.rows[i];
        if (row.cells[1].textContent === null) {
            continue;
        }
        var sort_value = parseFloat(row.cells[1].textContent);
        store.push([sort_value, row]);
    }
    store.sort(function (a, b) { return b[0] - a[0]; });
    for (var _i = 0, store_1 = store; _i < store_1.length; _i++) {
        var _a = store_1[_i], _ = _a[0], row = _a[1];
        table.appendChild(row);
    }
};
/**
 * Run the simulation. Chooses a random bonus `num_rounds` times and then puts the results in the table
 */
var run_simulation = function () {
    var num_success = {};
    for (var _i = 0, random_box_bonuses_2 = random_box_bonuses; _i < random_box_bonuses_2.length; _i++) {
        var random_bonus = random_box_bonuses_2[_i];
        num_success[random_bonus.name] = 0;
    }
    var num_rounds = 100000;
    for (var run = 0; run < num_rounds; run++) {
        num_success[select_random_bonus().name]++;
    }
    for (var _a = 0, _b = Object.keys(num_success); _a < _b.length; _a++) {
        var key = _b[_a];
        result_cells[key].textContent = ((num_success[key] / num_rounds) * 100).toFixed(2) + "%";
    }
    sort_table();
};
/**
 * Shuffle the array in place, to pick from later
 * @param {Array<T>} array Array to shuffle
 */
var shuffle_array = function (array) {
    var current_index = array.length, temp_value, random_index;
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
var select_random_bonus = function () {
    var evt = null;
    do {
        shuffle_array(random_box_bonuses);
        for (var _i = 0, random_box_bonuses_3 = random_box_bonuses; _i < random_box_bonuses_3.length; _i++) {
            var random_bonus = random_box_bonuses_3[_i];
            var chance = Math.random();
            if (chance <= random_bonus.chance) {
                evt = random_bonus;
            }
        }
    } while (evt !== null && toggled[evt.name] !== undefined && !toggled[evt.name]);
    //disabled warning because we don't break from the loop until it is not null... we could have an infinite loop here technically :shrug:
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return evt;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jYWxjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLEVBQUU7SUFDN0MsMkJBQTJCLEVBQUUsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQztBQUVILElBQU0sMkJBQTJCLEdBQUc7SUFDbkMsbUJBQW1CO0lBQ25CLElBQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUNyRSxJQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDdkUsSUFBSSxZQUFZLEtBQUssSUFBSSxJQUFJLGFBQWEsS0FBSyxJQUFJLEVBQUU7UUFDcEQsT0FBTztLQUNQO0lBQ0QsS0FBb0IsVUFBa0IsRUFBbEIseUNBQWtCLEVBQWxCLGdDQUFrQixFQUFsQixJQUFrQixFQUFFO1FBQW5DLElBQU0sS0FBSywyQkFBQTtRQUNmLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRTtZQUNyQixZQUFZLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ2pEO1FBQ0QsSUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRCxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQztRQUN2QyxJQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9DLElBQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0MsU0FBUyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ25DLFNBQVMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakMsU0FBUyxDQUFDLFdBQVcs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