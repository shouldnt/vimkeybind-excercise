class Store {
    static STATUS = {
        OPEN: 'OPEN',
        INPROGRESS: 'INPROGRESS',
        DONE: 'DONE'
    }
    static ACTION = {
        ADD: 'ADD',
        UPDATE: 'UPDATE',
        DELETE: 'DELETE',
    }
    data = [];
    _availableId = 0;
    constructor(type) {
        this.event = new Event(type);
        this.type = type;
    }
    init() {
        const _todo = [];
        this.data = _todo.map(todo => {
            todo.id = this._availableId;
            this._availableId++
            return todo;
        });
    }
    sub(cb) {
        const eventHandle = (e) => {
            cb(e.detail);
        }
        document.addEventListener(this.type, eventHandle)
        const unSub = () => document.removeEventListener(this.type, eventHandle);
        return unSub;
    }
    add(todo) {
        todo.id = this._availableId++;
        this.data.unshift(todo)
        this._changed([{id: todo.id, action: Store.ACTION.ADD, todo}])
    }
    addMultiple(todos) {
        todos.forEach(todo => {
            todo.id = this._availableId++;
            this.data.push(todos);
        })
        this._changed(todos.map(todo => {
            return {
              id: todo.id,
              action: Store.ACTION.ADD,
              todo
            };
        }))
    }
    delete(id) {
        this.data = this.data.filter(d => d.id !== id);
        this._changed([{id, action: Store.ACTION.DELETE}])
    }
    deleteMultible(ids) {
        this.data = this.data.filter(d => !ids.includes(d.id));
        this._changed(ids.map(id => {
            return {
              id,
              action: Store.ACTION.DELETE,
            };
        }))
    }
    changeStatus(id, status) {
        if(!Store.STATUS[status]) throw new Error(`invalid Status: ${status}, valid status: ${Object.values(Store.STATUS).join('/')}`)
        this.data.forEach(d => {
            if(d.id !== id) return;
            d.status = status;
        })
        this._changed([{id: id, action: Store.ACTION.UPDATE}])
    }
    _persist() {
        localStorage.setItem(this.type, JSON.stringify(this.data));
    }
    _changed(ids) {
        document.dispatchEvent(new CustomEvent(this.type, {
            detail: ids
        }))
        this._persist();
    }
}
let initialTodo = [];
const store = new Store('todo');
window.store = store;
store.init();

function createTodoEl(todo) {
    const todoEl = document.getElementById('todo-template').cloneNode(true);
    todoEl.style.display = 'block';
    todoEl.setAttribute('id', 'todo-' + todo.id);

    const descEl = todoEl.querySelector('.desc');
    descEl.innerHTML = todo.desc;

    const deleteBtn = todoEl.querySelector('.delete');
    const deleteTodo = () => {
        console.log('delete todo', todo);
        store.delete(todo.id);
    }
    deleteBtn.addEventListener('click', deleteTodo);

    const statusEls = todoEl.querySelectorAll('.status');

    const statusMap = [
        {className: 'open', status: Store.STATUS.OPEN},
        {className: 'inprogress', status: Store.STATUS.INPROGRESS},
        {className: 'done', status: Store.STATUS.DONE}
    ]
    const updateStatusUI = (status) => {
      statusEls.forEach((el) => {
        if(statusMap.some((item) => {
            return el.classList.contains(item.className) && status === item.status
        })) {
            el.classList.add("active");
        } else {
            el.classList.remove("active");
        }
      });
    };
    updateStatusUI(todo.status);

    statusEls.forEach(statusEl => {
        statusEl.addEventListener('click', (e) => {
            const matchStatus = statusMap.find(item => {
                return e.target.classList.contains(item.className)
            })
            if(!matchStatus || matchStatus.status === todo.status) return;
            store.changeStatus(todo.id, matchStatus.status);
        })
    })

    const unSub = store.sub((changes) => {
        changes.forEach(change => {
            if(change.id !== todo.id) return;
            if(change.action === Store.ACTION.UPDATE) {
                updateStatusUI(todo.status);
                return;
            }
            if(change.action === Store.ACTION.DELETE) {
                unSub();
                deleteBtn.removeEventListener("click", deleteTodo);
                todoEl.remove();
                return;
            }
        })
    })
    return todoEl;
};
document.addEventListener("DOMContentLoaded", () => {
    const containerEl = document.getElementById("todo-container");

    store.sub(changes => {
        changes.forEach(change => {
            if(change.action !== Store.ACTION.ADD) return;
            containerEl.prepend(createTodoEl(change.todo))
        })
    })

    const createTodoForm = document.querySelector('.create-todo form');
    createTodoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('create event', e);
        const desc = new FormData(e.target).get("desc");
        if(!desc.trim()) {
            console.error('desc is required!!!');
        };
        store.add({desc, status: Store.STATUS.OPEN});
    })

    store.data.forEach(todo => {
        containerEl.append(createTodoEl(todo));
    })
});