(function () {
    "use strict";

    let defaultAction;
    let bucket = window.location.href;
    const pos = bucket.lastIndexOf("/");
    if (pos > 0 && pos < bucket.length - 1) {
        bucket = bucket.substring(pos + 1);
    }

    window.toolbar = {
        bucket: bucket,
        declare: function () {},
        highlight: function () {},
        registered: [],
        finishedLoading: function () {
        window.toolbar.reset();

        if (defaultAction) {
            window.toolbar.highlight(defaultAction);
            defaultAction();
            defaultAction = undefined;
        }

        document.body.className = document.body.className.replace(
            /(?:\s|^)toolbar-loading(?:\s|$)/,
            " "
        );
        },
        addToggleButton: function (text, checked, onchange, toolbarID) {
        window.toolbar.declare(onchange);
        const input = document.createElement("input");
        input.checked = checked;
        input.type = "checkbox";
        input.style.pointerEvents = "none";
        const label = document.createElement("label");
        label.appendChild(input);
        label.appendChild(document.createTextNode(text));
        label.style.pointerEvents = "none";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cesium-button";
        button.appendChild(label);

        button.onclick = function () {
            window.toolbar.reset();
            window.toolbar.highlight(onchange);
            input.checked = !input.checked;
            onchange(input.checked);
        };

        document.getElementById(toolbarID || "toolbar").appendChild(button);
        },
        addToolbarButton: function (text, onclick, toolbarID) {
        window.toolbar.declare(onclick);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cesium-button";
        button.onclick = function () {
            window.toolbar.reset();
            window.toolbar.highlight(onclick);
            onclick();
        };
        button.textContent = text;
        document.getElementById(toolbarID || "toolbar").appendChild(button);
        },
        addToolbarMenu: function (options, toolbarID) {
        const menu = document.createElement("select");
        menu.className = "cesium-button";
        menu.onchange = function () {
            window.toolbar.reset();
            const item = options[menu.selectedIndex];
            if (item && typeof item.onselect === "function") {
            item.onselect();
            }
        };
        document.getElementById(toolbarID || "toolbar").appendChild(menu);

        if (!defaultAction && typeof options[0].onselect === "function") {
            defaultAction = options[0].onselect;
        }

        for (let i = 0, len = options.length; i < len; ++i) {
            const option = document.createElement("option");
            option.textContent = options[i].text;
            option.value = options[i].value;
            menu.appendChild(option);
        }
        },
        reset: function () {},
    };
})();
