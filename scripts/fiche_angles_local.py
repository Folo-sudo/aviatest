#!/usr/bin/env python3
"""Standalone local version of the Fiche Angles exercise.

Run with:
    python3 scripts/fiche_angles_local.py
"""

from __future__ import annotations

import math
import random
import tkinter as tk
from dataclasses import dataclass
from tkinter import messagebox, ttk


TOTAL_ANGLES = 100
CANVAS_W = 760
CANVAS_H = 520


@dataclass(frozen=True)
class AngleQuestion:
    hand_a: int
    hand_o: int
    answer: int
    length_a: float
    length_o: float


@dataclass(frozen=True)
class AngleResult:
    question: AngleQuestion
    user_angle: int | None
    error: int


def deg_to_point(deg: float, cx: float, cy: float, radius: float) -> tuple[float, float]:
    rad = math.radians(deg)
    return cx + radius * math.cos(rad), cy - radius * math.sin(rad)


def generate_question() -> AngleQuestion:
    hand_a = random.randint(0, 35) * 10
    answer = random.randint(1, 17) * 10
    direction = 1 if random.random() < 0.5 else -1
    hand_o = (hand_a + direction * answer) % 360
    length_a = random.uniform(0.28, 0.46)
    length_o = random.uniform(0.28, 0.46)

    return AngleQuestion(hand_a, hand_o, answer, length_a, length_o)


def generate_questions() -> list[AngleQuestion]:
    return [generate_question() for _ in range(TOTAL_ANGLES)]


def snap_to_10(value: int) -> int:
    return round(value / 10) * 10


def normalize_angle(value: int) -> int:
    return value % 360


def accepted_answers(answer: int) -> tuple[int, int]:
    return answer, (360 - answer) % 360


def angle_error(user_angle: int, answer: int) -> int:
    normalized = normalize_angle(user_angle)
    return min(abs(normalized - accepted) for accepted in accepted_answers(answer))


class FicheAnglesApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Fiche Angles - Local")
        self.root.geometry("820x700")
        self.root.minsize(760, 650)

        self.questions: list[AngleQuestion] = []
        self.results: list[AngleResult] = []
        self.current_idx = 0
        self.showing_correction = False

        self.main = ttk.Frame(root, padding=16)
        self.main.pack(fill="both", expand=True)

        self.header = ttk.Label(self.main, text="Fiche Angles", font=("Arial", 24, "bold"))
        self.header.pack(pady=(0, 4))

        self.subtitle = ttk.Label(
            self.main,
            text="100 angles a estimer - precision 10 degres",
            font=("Arial", 13),
        )
        self.subtitle.pack(pady=(0, 12))

        self.status = ttk.Label(self.main, text="", font=("Arial", 13, "bold"))
        self.status.pack(pady=(0, 8))

        self.canvas = tk.Canvas(self.main, width=CANVAS_W, height=CANVAS_H, bg="#f8fafc", highlightthickness=1)
        self.canvas.pack(pady=(0, 12))

        controls = ttk.Frame(self.main)
        controls.pack(fill="x", pady=(0, 8))

        ttk.Label(controls, text="Votre angle :", font=("Arial", 12)).pack(side="left", padx=(0, 8))
        self.answer_var = tk.StringVar()
        self.answer_entry = ttk.Entry(controls, textvariable=self.answer_var, width=12, font=("Arial", 16))
        self.answer_entry.pack(side="left", padx=(0, 8))
        self.answer_entry.bind("<Return>", lambda _event: self.handle_action())
        self.answer_entry.bind("<Up>", lambda _event: self.bump_answer(10))
        self.answer_entry.bind("<Down>", lambda _event: self.bump_answer(-10))

        self.action_btn = ttk.Button(controls, text="Valider", command=self.handle_action)
        self.action_btn.pack(side="left", padx=(0, 8))

        self.feedback = ttk.Label(self.main, text="", font=("Arial", 12))
        self.feedback.pack(pady=(0, 8))

        footer = ttk.Frame(self.main)
        footer.pack(fill="x", side="bottom")
        ttk.Button(footer, text="Recommencer", command=self.start).pack(side="left")
        ttk.Button(footer, text="Quitter", command=self.root.destroy).pack(side="right")

        self.start()

    def start(self) -> None:
        self.questions = generate_questions()
        self.results = []
        self.current_idx = 0
        self.showing_correction = False
        self.answer_var.set("")
        self.feedback.config(text="")
        self.action_btn.config(text="Valider")
        self.render_question()
        self.answer_entry.focus_set()

    def current_question(self) -> AngleQuestion:
        return self.questions[self.current_idx]

    def bump_answer(self, delta: int) -> str:
        raw = self.answer_var.get().strip()
        try:
            current = int(raw)
        except ValueError:
            current = 0
        self.answer_var.set(str(snap_to_10(current + delta)))
        return "break"

    def submit_answer(self) -> None:
        if self.showing_correction:
            return

        raw = self.answer_var.get().strip()
        q = self.current_question()

        if raw == "":
            snapped = None
            error = q.answer
        else:
            try:
                parsed = int(raw)
            except ValueError:
                messagebox.showwarning("Reponse invalide", "Entre un angle en degres, par exemple 130 ou -40.")
                return

            snapped = snap_to_10(parsed)
            self.answer_var.set(str(snapped))
            error = angle_error(snapped, q.answer)

        result = AngleResult(q, snapped, error)
        self.results.append(result)
        self.showing_correction = True

        if snapped is None:
            text = f"Pas de reponse. Bonnes reponses : {self.format_expected(q)}."
        elif error == 0:
            text = f"Parfait. Reponse acceptee : {snapped:+d} degres."
        else:
            text = f"Erreur : {error} degres. Votre reponse : {snapped:+d}. Bonnes reponses : {self.format_expected(q)}."
        self.feedback.config(text=text)
        self.action_btn.config(text="Angle suivant")
        self.render_question(result)

    def handle_action(self) -> None:
        if self.showing_correction:
            self.next_question()
        else:
            self.submit_answer()

    def next_question(self) -> None:
        if self.current_idx + 1 >= len(self.questions):
            self.show_results()
            return
        self.current_idx += 1
        self.showing_correction = False
        self.answer_var.set("")
        self.feedback.config(text="")
        self.action_btn.config(text="Valider")
        self.render_question()
        self.answer_entry.focus_set()

    def show_results(self) -> None:
        total = len(self.results)
        perfect = sum(1 for r in self.results if r.error == 0)
        close = sum(1 for r in self.results if r.error <= 10)
        avg = round(sum(r.error for r in self.results) / total) if total else 0

        details = "\n".join(
            f"{i + 1:02d}. attendu {self.format_expected(r.question):>12}  reponse {self.format_answer(r.user_angle):>4}  erreur {r.error:3d}"
            for i, r in enumerate(self.results)
        )
        messagebox.showinfo(
            "Resultats",
            f"Parfaits : {perfect}/{total}\n"
            f"A 10 degres ou moins : {close}/{total}\n"
            f"Erreur moyenne : {avg} degres\n\n"
            f"Detail :\n{details}",
        )
        self.start()

    def render_question(self, result: AngleResult | None = None) -> None:
        q = self.current_question()
        self.canvas.delete("all")
        self.status.config(text=f"Question {self.current_idx + 1} / {TOTAL_ANGLES}")

        self.canvas.create_rectangle(0, 0, CANVAS_W, CANVAS_H, fill="#f8fafc", outline="#cbd5e1")
        self.canvas.create_text(
            CANVAS_W / 2,
            28,
            text="Angle non oriente entre A et O",
            font=("Arial", 15, "bold"),
            fill="#334155",
        )

        self.draw_angle_display(CANVAS_W / 2, 250, 260, q)

        self.canvas.create_text(
            CANVAS_W / 2,
            430,
            text="Les deux sens sont acceptes : x et 360 - x",
            font=("Arial", 13, "bold"),
            fill="#334155",
        )

        if result is not None:
            self.draw_correction(q, result)

    @staticmethod
    def format_answer(value: int | None) -> str:
        return "--" if value is None else f"{value:+d}"

    @staticmethod
    def format_expected(q: AngleQuestion) -> str:
        answer, complement = accepted_answers(q.answer)
        return f"{answer} ou {complement}"

    def draw_angle_display(self, cx: float, cy: float, size: float, q: AngleQuestion) -> None:
        half = size / 2
        self.canvas.create_rectangle(cx - half, cy - half, cx + half, cy + half, fill="#e2e8f0", outline="#cbd5e1")
        self.canvas.create_oval(cx - 4, cy - 4, cx + 4, cy + 4, fill="#1e293b", outline="")

        ax, ay = deg_to_point(q.hand_a, cx, cy, size * q.length_a)
        ox, oy = deg_to_point(q.hand_o, cx, cy, size * q.length_o)

        self.canvas.create_line(cx, cy, ax, ay, width=4, fill="#2563eb")
        self.canvas.create_line(cx, cy, ox, oy, width=4, fill="#dc2626")
        self.canvas.create_oval(ax - 5, ay - 5, ax + 5, ay + 5, fill="#2563eb", outline="")
        self.canvas.create_oval(ox - 5, oy - 5, ox + 5, oy + 5, fill="#dc2626", outline="")
        self.canvas.create_text(ax + (16 if ax >= cx else -16), ay + (18 if ay >= cy else -12), text="A", font=("Arial", 16, "bold"), fill="#2563eb")
        self.canvas.create_text(ox + (16 if ox >= cx else -16), oy + (18 if oy >= cy else -12), text="O", font=("Arial", 16, "bold"), fill="#dc2626")

    def draw_correction(self, q: AngleQuestion, result: AngleResult) -> None:
        x0, y0 = 16, 470
        self.canvas.create_rectangle(x0, y0, CANVAS_W - 16, CANVAS_H - 16, fill="#ffffff", outline="#cbd5e1")
        color = "#16a34a" if result.error == 0 else "#dc2626"
        self.canvas.create_text(
            CANVAS_W / 2,
            y0 + 24,
            text=f"Correction : attendu {self.format_expected(q)} degres | vous {self.format_answer(result.user_angle)} degres | erreur {result.error} degres",
            font=("Arial", 13, "bold"),
            fill=color,
        )


def main() -> None:
    root = tk.Tk()
    style = ttk.Style(root)
    if "clam" in style.theme_names():
        style.theme_use("clam")
    FicheAnglesApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
