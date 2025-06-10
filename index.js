const STATUS = {
  OPEN: "OPEN",
  INPROGRESS: "INPROGRESS",
  DONE: "DONE",
};
const FILTER_TYPE = {
  ALL: "ALL",
  ...STATUS,
};
const CLASS_TO_STATUS = [
  { className: "open", status: STATUS.OPEN },
  { className: "inprogress", status: STATUS.INPROGRESS },
  { className: "done", status: STATUS.DONE },
];
const CLASS_TO_FILTER = [
  { className: "all", status: FILTER_TYPE.ALL },
    ...CLASS_TO_STATUS,
]
class Store {
  static STATUS = {
    OPEN: "OPEN",
    INPROGRESS: "INPROGRESS",
    DONE: "DONE",
  };
  static ACTION = {
    ADD: "ADD",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
  };
  data = [];
  _availableId = 0;
  constructor(type) {
    this.event = new Event(type);
    this.type = type;
  }
  init() {
    const _todo = JSON.parse(localStorage.getItem("todo") ?? "[]");
    this.currentFilter = STATUS.ALL;
    this.data = _todo.map((todo) => {
      todo.id = this._availableId;
      this._availableId++;
      return todo;
    });
  }
  setFilter(type) {
    const _result = FILTER_TYPE[type];
    if (!_result) return;
    this.currentFilter = type;
    document.dispatchEvent(
      new CustomEvent(this.type + ":filterChanged", {
        detail: type,
      })
    );
  }
  sub(cb, type = this.type) {
    const eventHandle = (e) => {
      cb(e.detail);
    };
    document.addEventListener(type, eventHandle);
    const unSub = () => document.removeEventListener(type, eventHandle);
    return unSub;
  }
  add(todo) {
    todo.id = this._availableId++;
    this.data.unshift(todo);
    this._changed([{ id: todo.id, action: Store.ACTION.ADD, todo }]);
  }
  addMultiple(todos) {
    todos.forEach((todo) => {
      todo.id = this._availableId++;
      this.data.push(todos);
    });
    this._changed(
      todos.map((todo) => {
        return {
          id: todo.id,
          action: Store.ACTION.ADD,
          todo,
        };
      })
    );
  }
  delete(id) {
    this.data = this.data.filter((d) => d.id !== id);
    this._changed([{ id, action: Store.ACTION.DELETE }]);
  }
  deleteMultible(ids) {
    this.data = this.data.filter((d) => !ids.includes(d.id));
    this._changed(
      ids.map((id) => {
        return {
          id,
          action: Store.ACTION.DELETE,
        };
      })
    );
  }
  changeStatus(id, status) {
    if (!STATUS[status])
      throw new Error(
        `invalid Status: ${status}, valid status: ${Object.values(STATUS).join(
          "/"
        )}`
      );
    this.data.forEach((d) => {
      if (d.id !== id) return;
      d.status = status;
    });
    this._changed([{ id: id, action: Store.ACTION.UPDATE }]);
  }
  _persist() {
    localStorage.setItem(this.type, JSON.stringify(this.data));
  }
  _changed(ids) {
    document.dispatchEvent(
      new CustomEvent(this.type, {
        detail: ids,
      })
    );
    this._persist();
  }
}
const store = new Store("todo");
window.store = store;
store.init();

function createTodoEl(todo) {
  const todoEl = document.getElementById("todo-template").cloneNode(true);
  todoEl.style.display = "block";
  todoEl.setAttribute("id", "todo-" + todo.id);

  const descEl = todoEl.querySelector(".desc");
  descEl.innerHTML = todo.desc;

  const deleteBtn = todoEl.querySelector(".delete");
  const deleteTodo = () => {
    console.log("delete todo", todo);
    store.delete(todo.id);
  };
  deleteBtn.addEventListener("click", deleteTodo);

  const statusEls = todoEl.querySelectorAll(".status");

  const updateStatusUI = (status) => {
    statusEls.forEach((el) => {
      if (
        CLASS_TO_STATUS.some((item) => {
          return (
            el.classList.contains(item.className) && status === item.status
          );
        })
      ) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });
  };
  updateStatusUI(todo.status);

  statusEls.forEach((statusEl) => {
    statusEl.addEventListener("click", (e) => {
      const matchStatus = CLASS_TO_STATUS.find((item) => {
        return e.target.classList.contains(item.className);
      });
      if (!matchStatus || matchStatus.status === todo.status) return;
      store.changeStatus(todo.id, matchStatus.status);
    });
  });

  const unSub = store.sub((changes) => {
    changes.forEach((change) => {
      if (change.id !== todo.id) return;
      if (change.action === Store.ACTION.UPDATE) {
        updateStatusUI(todo.status);
        return;
      }
      if (change.action === Store.ACTION.DELETE) {
        unSub();
        deleteBtn.removeEventListener("click", deleteTodo);
        todoEl.remove();
        return;
      }
    });
  });
  return todoEl;
}
document.addEventListener("DOMContentLoaded", () => {
  const containerEl = document.getElementById("todo-container");

  store.sub((changes) => {
    changes.forEach((change) => {
      if (change.action !== Store.ACTION.ADD) return;
      containerEl.prepend(createTodoEl(change.todo));
    });
  });

  const filterEls = document.querySelectorAll(".change-filter .filter");
  filterEls.forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.classList.contains("active")) return;
      const filterType = CLASS_TO_FILTER.find(item => {
        return e.target.classList.contains(item.className);
      })

      if(!filterType) return;

      store.setFilter(filterType.status);
    });
  });
  store.sub((filterType) => {
    containerEl.replaceChildren(); // remove all child
    const classToFilter = CLASS_TO_FILTER.find(item => {
        return item.status === filterType;
    })

    if(classToFilter) {
        filterEls.forEach(el => {
            if(el.classList.contains(classToFilter.className)) {
                el.classList.add('active')
            } else {
                el.classList.remove('active')
            }
        });
    }
    store.data.forEach((todo) => {
      if (todo.status === filterType || filterType === FILTER_TYPE.ALL) {
        containerEl.append(createTodoEl(todo));
      }
    });
  }, store.type + ":filterChanged");
  const createTodoForm = document.querySelector(".create-todo form");
  createTodoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    console.log("create event", e);
    const desc = new FormData(e.target).get("desc");
    if (!desc.trim()) {
      console.error("desc is required!!!");
    }
    store.add({ desc, status: STATUS.OPEN });
  });

  store.data.forEach((todo) => {
    containerEl.append(createTodoEl(todo));
  });
});
