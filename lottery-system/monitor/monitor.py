import tkinter as tk
from tkinter import scrolledtext, ttk, messagebox, filedialog
import subprocess
import threading
import time
import os
import socket
import webbrowser
import json
import re
from datetime import datetime

PROJECT_ROOT = r"g:\Desktop\创建工作区\lottery-system"
CONFIG_FILE = os.path.join(PROJECT_ROOT, "monitor", "monitor_config.json")

SERVICES = {
    "后端服务 (Backend)": {
        "path": os.path.join(PROJECT_ROOT, "backend"),
        "cmd": ["npm", "start"],
        "port": 3000,
        "pid": None,
        "status_label": None,
        "pid_label": None,
        "auto_start": True,
        "check_var": None,
        "log_count": 0,
        "error_count": 0,
    },
    "管理后台 (Admin)": {
        "path": os.path.join(PROJECT_ROOT, "admin"),
        "cmd": ["npm", "run", "dev"],
        "port": 5173,
        "pid": None,
        "status_label": None,
        "pid_label": None,
        "auto_start": True,
        "check_var": None,
        "log_count": 0,
        "error_count": 0,
    },
    "抽奖展示 (Display)": {
        "path": os.path.join(PROJECT_ROOT, "display"),
        "cmd": ["npm", "run", "dev"],
        "port": 5174,
        "pid": None,
        "status_label": None,
        "pid_label": None,
        "auto_start": True,
        "check_var": None,
        "log_count": 0,
        "error_count": 0,
    },
}

log_texts = {}
root = None
auto_refresh = True

COLORS = {
    "info": "#2196F3",
    "success": "#4CAF50",
    "warning": "#FF9800",
    "error": "#F44336",
    "system": "#9C27B0",
    "timestamp": "#607D8B",
    "npm": "#795548",
    "vite": "#42b883",
    "default": "#333333",
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {"auto_start": {}}

def save_config():
    config = {"auto_start": {name: info.get("auto_start", True) for name, info in SERVICES.items()}}
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
    except:
        pass

def check_service_async(port, callback):
    def run():
        for addr in [('127.0.0.1', port), ('::1', port)]:
            try:
                sock = socket.socket(socket.AF_INET6 if ':' in addr[0] else socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.3)
                if sock.connect_ex(addr) == 0:
                    sock.close()
                    callback(True)
                    return
            except:
                pass
        callback(False)
    threading.Thread(target=run, daemon=True).start()

def find_pid_by_port_async(port, callback):
    def run():
        pid = None
        try:
            result = subprocess.run(f'netstat -ano | findstr :{port}', shell=True, capture_output=True, text=True)
            for line in result.stdout.splitlines():
                if "LISTENING" in line:
                    pid = int(line.split()[-1])
                    break
        except:
            pass
        callback(pid)
    threading.Thread(target=run, daemon=True).start()

def update_status_batch():
    if not auto_refresh:
        return
    
    results = {}
    count = [len(SERVICES)]
    
    def on_result(name, is_running, pid):
        results[name] = (is_running, pid)
        count[0] -= 1
        if count[0] == 0:
            for n, (running, p) in results.items():
                info = SERVICES[n]
                if running:
                    info["status_label"].config(text="● 运行中", foreground="#4CAF50")
                    info["pid"] = p
                    info["pid_label"].config(text=f"PID:{p}" if p else "PID:-")
                else:
                    info["status_label"].config(text="○ 已停止", foreground="#F44336")
                    info["pid"] = None
                    info["pid_label"].config(text="PID:-")
                if "link_label" in info:
                    info["link_label"].config(foreground="#4CAF50" if running else "gray")

    for name, info in SERVICES.items():
        port = info["port"]
        def on_check(is_running, p=port, n=name):
            if is_running:
                find_pid_by_port_async(p, lambda pid, n=n, r=is_running: on_result(n, r, pid))
            else:
                on_result(n, False, None)
        check_service_async(port, on_check)

def strip_ansi(text):
    return re.sub(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])', '', text)

def get_log_type(text):
    t = text.lower()
    if any(x in t for x in ['error', 'err', 'failed', 'exception']):
        return "error"
    if any(x in t for x in ['warn', 'deprecated']):
        return "warning"
    if any(x in t for x in ['success', '成功', 'started', 'ready']):
        return "success"
    if any(x in t for x in ['vite', 'localhost']):
        return "vite"
    if any(x in t for x in ['npm', 'node']):
        return "npm"
    if text.startswith('[') or '正在' in text or '已停止' in text:
        return "system"
    return "default"

def log_append(log_widget, text, service_name=None, tag_name=None):
    if not text or not text.strip():
        return
    text = strip_ansi(text)
    timestamp = datetime.now().strftime('%H:%M:%S')
    log_type = tag_name or get_log_type(text)
    color = COLORS.get(log_type, COLORS["default"])
    tag_key = f"tag_{log_type}_{timestamp}"
    
    def _append():
        try:
            log_widget.tag_configure(tag_key, foreground=color)
            log_widget.insert(tk.END, f"[{timestamp}] {text}\n", tag_key)
            log_widget.see(tk.END)
        except:
            pass
    
    if root:
        root.after(0, _append)
    else:
        _append()
    
    if service_name and service_name in SERVICES:
        SERVICES[service_name]["log_count"] = SERVICES[service_name].get("log_count", 0) + 1
        if log_type == "error":
            SERVICES[service_name]["error_count"] = SERVICES[service_name].get("error_count", 0) + 1
        if root:
            root.after(0, lambda: update_log_stats(service_name))

def update_log_stats(service_name):
    if service_name not in SERVICES:
        return
    info = SERVICES[service_name]
    if "stats_label" in info:
        log_count = info.get("log_count", 0)
        error_count = info.get("error_count", 0)
        stats_text = f"日志:{log_count}"
        if error_count > 0:
            stats_text += f" 错误:{error_count}"
        info["stats_label"].config(text=stats_text)

def read_logs(process, log_widget, service_name):
    def stream():
        try:
            while True:
                line = process.stdout.readline()
                if not line:
                    if process.poll() is not None:
                        break
                    time.sleep(0.05)
                    continue
                try:
                    line = line.decode("utf-8", errors="ignore").strip()
                except:
                    line = str(line).strip()
                if line:
                    log_append(log_widget, line, service_name)
        except:
            pass
        try:
            remaining = process.stdout.read()
            if remaining:
                for line in remaining.decode("utf-8", errors="ignore").splitlines():
                    if line.strip():
                        log_append(log_widget, line, service_name)
        except:
            pass
    threading.Thread(target=stream, daemon=True).start()

def start_service(name, info, log_widget):
    def do_start():
        log_append(log_widget, f"启动 {name}...", name, "system")
        try:
            process = subprocess.Popen(
                "npm start" if info["port"] == 3000 else "npm run dev",
                cwd=info["path"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=True,
            )
            read_logs(process, log_widget, name)
            for _ in range(60):
                time.sleep(0.5)
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(1)
                try:
                    if sock.connect_ex(('127.0.0.1', info["port"])) == 0:
                        sock.close()
                        find_pid_by_port_async(info["port"], lambda pid: (
                            log_append(log_widget, f"启动成功 (PID:{pid})", name, "success"),
                            update_status_batch()
                        ))
                        return
                except:
                    pass
            log_append(log_widget, f"{name} 启动超时", name, "warning")
        except Exception as e:
            log_append(log_widget, f"启动失败: {e}", name, "error")

    find_pid_by_port_async(info["port"], lambda pid: (
        log_append(log_widget, f"已在运行 (PID:{pid})", name, "info") if pid else do_start()
    ))

def stop_service(name, info, log_widget):
    def run():
        pid = info["pid"]
        if not pid:
            find_pid_by_port_async(info["port"], lambda p: do_stop(p))
        else:
            do_stop(pid)

    def do_stop(p):
        if p:
            subprocess.run(f"taskkill /F /PID {p}", shell=True, capture_output=True)
            log_append(log_widget, f"已停止 (PID:{p})", name, "system")
            info["pid"] = None
        else:
            log_append(log_widget, "未找到进程", name, "warning")
        update_status_batch()

    threading.Thread(target=run, daemon=True).start()

def restart_service(name, info, log_widget):
    def run():
        pid = info["pid"]
        if not pid:
            find_pid_by_port_async(info["port"], lambda p: do_restart(p))
        else:
            do_restart(pid)

    def do_restart(p):
        if p:
            subprocess.run(f"taskkill /F /PID {p}", shell=True, capture_output=True)
            log_append(log_widget, "已停止，重启中...", name, "system")
            info["pid"] = None
            time.sleep(1)
        start_service(name, info, log_widget)

    threading.Thread(target=run, daemon=True).start()

def clear_log(log_widget, service_name=None):
    log_widget.delete("1.0", tk.END)
    if service_name and service_name in SERVICES:
        SERVICES[service_name]["log_count"] = 0
        SERVICES[service_name]["error_count"] = 0
        update_log_stats(service_name)

def export_log(log_widget, service_name):
    content = log_widget.get("1.0", tk.END)
    if not content.strip():
        messagebox.showinfo("提示", "日志为空")
        return
    filename = filedialog.asksaveasfilename(
        defaultextension=".log",
        filetypes=[("日志文件", "*.log")],
        initialfile=f"{service_name}_{datetime.now():%Y%m%d_%H%M%S}.log"
    )
    if filename:
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            messagebox.showinfo("成功", f"已导出")
        except Exception as e:
            messagebox.showerror("错误", f"导出失败: {e}")

def search_log(log_widget, search_var, service_name):
    search_text = search_var.get().strip()
    if not search_text:
        return
    log_widget.tag_remove("hl", "1.0", tk.END)
    log_widget.tag_configure("hl", background="yellow", foreground="black")
    start_pos, count = "1.0", 0
    while True:
        pos = log_widget.search(search_text, start_pos, tk.END, nocase=True)
        if not pos:
            break
        log_widget.tag_add("hl", pos, f"{pos}+{len(search_text)}c")
        start_pos = f"{pos}+{len(search_text)}c"
        count += 1
    if count > 0:
        log_widget.see(log_widget.tag_ranges("hl")[0])
    messagebox.showinfo("搜索", f"找到 {count} 处")

def start_selected():
    for name, info in SERVICES.items():
        if info.get("check_var") and info["check_var"].get():
            start_service(name, info, log_texts[name])

def stop_all():
    for name, info in SERVICES.items():
        stop_service(name, info, log_texts[name])

def open_all_links():
    for name, info in SERVICES.items():
        if info.get("pid"):
            webbrowser.open(f"http://localhost:{info['port']}")

def create_gui():
    global root, auto_refresh
    
    config = load_config()
    root = tk.Tk()
    root.title("服务管理器")
    root.geometry("750x580")
    root.minsize(600, 400)
    
    main_frame = ttk.Frame(root, padding=8)
    main_frame.pack(fill=tk.BOTH, expand=True)
    
    header = ttk.Frame(main_frame)
    header.pack(fill=tk.X, pady=(0, 8))
    tk.Label(header, text="🚀 服务管理器", font=("Microsoft YaHei", 14, "bold")).pack(side=tk.LEFT)
    ttk.Button(header, text="🔗 打开全部", command=open_all_links, width=10).pack(side=tk.RIGHT, padx=5)
    
    for name, info in SERVICES.items():
        info["auto_start"] = config.get("auto_start", {}).get(name, True)
        
        frame = ttk.LabelFrame(main_frame, text=name, padding=6)
        frame.pack(fill=tk.X, pady=3)
        
        row1 = ttk.Frame(frame)
        row1.pack(fill=tk.X)
        
        check_var = tk.BooleanVar(value=info["auto_start"])
        info["check_var"] = check_var
        ttk.Checkbutton(row1, variable=check_var, command=lambda n=name, v=check_var: (SERVICES[n].update({"auto_start": v.get()}), save_config())).pack(side=tk.LEFT)
        
        status_label = tk.Label(row1, text="○ 检查中...", font=("Microsoft YaHei", 9))
        status_label.pack(side=tk.LEFT, padx=5)
        info["status_label"] = status_label
        
        tk.Label(row1, text=f":{info['port']}", font=("Microsoft YaHei", 9), fg="gray").pack(side=tk.LEFT)
        
        pid_label = tk.Label(row1, text="PID:-", font=("Microsoft YaHei", 8), fg="gray")
        pid_label.pack(side=tk.LEFT, padx=5)
        info["pid_label"] = pid_label
        
        stats_label = tk.Label(row1, text="日志:0", font=("Microsoft YaHei", 8), fg="gray")
        stats_label.pack(side=tk.LEFT, padx=5)
        info["stats_label"] = stats_label
        
        url = f"http://localhost:{info['port']}"
        link_label = tk.Label(row1, text="🌐", fg="#2196F3", cursor="hand2")
        link_label.pack(side=tk.LEFT, padx=5)
        link_label.bind("<Button-1>", lambda e, u=url: webbrowser.open(u))
        info["link_label"] = link_label
        
        ttk.Button(row1, text="▶", width=2, command=lambda n=name, i=info: start_service(n, i, log_texts[n])).pack(side=tk.RIGHT, padx=2)
        ttk.Button(row1, text="⏹", width=2, command=lambda n=name, i=info: stop_service(n, i, log_texts[n])).pack(side=tk.RIGHT, padx=2)
        ttk.Button(row1, text="🔄", width=2, command=lambda n=name, i=info: restart_service(n, i, log_texts[n])).pack(side=tk.RIGHT, padx=2)
        
        row2 = ttk.Frame(frame)
        row2.pack(fill=tk.X, pady=2)
        
        search_var = tk.StringVar()
        se = ttk.Entry(row2, textvariable=search_var, width=18)
        se.pack(side=tk.LEFT, padx=2)
        se.insert(0, "搜索...")
        se.bind("<FocusIn>", lambda e, w=se: w.delete(0, tk.END) if w.get() == "搜索..." else None)
        se.bind("<Return>", lambda e, sv=search_var, sn=name: search_log(log_texts[sn], sv, sn))
        
        ttk.Button(row2, text="🔍", width=2, command=lambda sv=search_var, sn=name: search_log(log_texts[sn], sv, sn)).pack(side=tk.LEFT, padx=2)
        ttk.Button(row2, text="🗑", width=2, command=lambda sn=name: clear_log(log_texts[sn], sn)).pack(side=tk.LEFT, padx=2)
        ttk.Button(row2, text="�", width=2, command=lambda sn=name: export_log(log_texts[sn], sn)).pack(side=tk.LEFT, padx=2)
        
        log_text = scrolledtext.ScrolledText(frame, height=3, font=("Consolas", 8), wrap=tk.WORD)
        log_text.pack(fill=tk.X, pady=2)
        log_texts[name] = log_text
    
    btn_row = ttk.Frame(main_frame)
    btn_row.pack(pady=8)
    ttk.Button(btn_row, text="▶ 启动选中", command=start_selected, width=12).pack(side=tk.LEFT, padx=5)
    ttk.Button(btn_row, text="⏹ 全部停止", command=stop_all, width=12).pack(side=tk.LEFT, padx=5)
    ttk.Button(btn_row, text="🔄 刷新状态", command=update_status_batch, width=12).pack(side=tk.LEFT, padx=5)
    
    tk.Label(main_frame, text=f"📁 {PROJECT_ROOT}", font=("Microsoft YaHei", 8), fg="gray").pack(side=tk.BOTTOM, pady=5)
    
    def schedule_refresh():
        update_status_batch()
        root.after(3000, schedule_refresh)
    
    schedule_refresh()
    root.mainloop()

if __name__ == "__main__":
    create_gui()
