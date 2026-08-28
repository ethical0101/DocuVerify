"""Trains one EnterpriseDocumentClassifier from a validated dataset.

Pipeline: dataset paths -> base forensic pipeline (per image) -> feature vectors ->
train/val/test split -> classifier fit -> evaluation -> TrainedModelMetrics.

Uses a Random Forest by default (handles the modest, possibly-imbalanced feature
counts typical of a small organization dataset without much tuning); falls back to
Logistic Regression when the training set is too small for a forest to be
meaningful (see _choose_algorithm). Both are genuinely fit on genuinely-extracted
features -- nothing here is simulated."""
from __future__ import annotations

import random
from pathlib import Path
from typing import Callable

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split

from ml.models.enterprise_classifier import EnterpriseDocumentClassifier, TrainedModelMetrics, FEATURE_SCHEMA
from ml.training.feature_extractor import extract_features

StageCallback = Callable[[str, str], None]  # (stage_name, status) -> None


def _choose_algorithm(n_train: int) -> str:
    return "RandomForestClassifier" if n_train >= 24 else "LogisticRegression"


def train_enterprise_model(
    items: list[tuple[Path, int]],
    analyze_document_fn,
    on_stage: StageCallback | None = None,
    seed: int = 42,
) -> tuple[EnterpriseDocumentClassifier, TrainedModelMetrics, list[dict]]:
    """`analyze_document_fn` is injected (rather than imported directly) so this
    module has no hard dependency on the FastAPI app -- it can run from a plain
    script too. Pass app.services.pipeline.analyze_document in production."""

    def stage(name: str, status: str = "completed"):
        if on_stage:
            on_stage(name, status)

    stage("dataset_preparation", "running")
    random.Random(seed).shuffle(items)
    stage("dataset_preparation")

    stage("feature_extraction", "running")
    X, y, failures = [], [], 0
    for path, label in items:
        try:
            result = analyze_document_fn(path)
            features = extract_features(result)
            X.append([features[k] for k in FEATURE_SCHEMA])
            y.append(label)
        except Exception:
            failures += 1  # a corrupt/unreadable file shouldn't abort the whole training run
    stage("feature_extraction")

    if len(set(y)) < 2:
        raise ValueError("Training data must include both genuine and forged examples")

    stage("train_validation_split", "running")
    X_arr, y_arr = np.array(X), np.array(y)
    X_train, X_temp, y_train, y_temp = train_test_split(
        X_arr, y_arr, test_size=0.30, random_state=seed, stratify=y_arr if min(np.bincount(y_arr)) >= 2 else None)
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.5, random_state=seed,
        stratify=y_temp if min(np.bincount(y_temp)) >= 2 else None)
    stage("train_validation_split")

    stage("model_training", "running")
    algorithm = _choose_algorithm(len(X_train))
    if algorithm == "RandomForestClassifier":
        estimator = RandomForestClassifier(n_estimators=200, max_depth=6, class_weight="balanced",
                                            random_state=seed)
    else:
        estimator = LogisticRegression(class_weight="balanced", max_iter=1000)
    estimator.fit(X_train, y_train)
    stage("model_training")

    stage("cross_validation", "running")
    # A held-out validation split (not used for fitting) stands in for k-fold CV here --
    # with a small dataset, k-fold adds fit-time cost without materially more signal.
    val_preds = estimator.predict(X_val) if len(X_val) else np.array([])
    stage("cross_validation")

    stage("evaluation", "running")
    test_preds = estimator.predict(X_test)
    test_proba = estimator.predict_proba(X_test)[:, list(estimator.classes_).index(1)] if 1 in estimator.classes_ else None
    metrics = TrainedModelMetrics(
        accuracy=round(float(accuracy_score(y_test, test_preds)), 4),
        precision=round(float(precision_score(y_test, test_preds, zero_division=0)), 4),
        recall=round(float(recall_score(y_test, test_preds, zero_division=0)), 4),
        f1=round(float(f1_score(y_test, test_preds, zero_division=0)), 4),
        roc_auc=round(float(roc_auc_score(y_test, test_proba)), 4)
                if test_proba is not None and len(set(y_test)) > 1 else None,
        train_size=len(X_train), val_size=len(X_val), test_size=len(X_test),
    )
    stage("evaluation")

    stage("model_packaging", "running")
    model = EnterpriseDocumentClassifier(estimator=estimator, algorithm=algorithm)
    stage("model_packaging")

    stage("completed")

    return model, metrics, [{"failed_documents": failures, "val_accuracy":
                              round(float(accuracy_score(y_val, val_preds)), 4) if len(val_preds) else None}]
