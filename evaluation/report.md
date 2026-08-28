# Evaluation Report
Test set size: 48
Mean authenticity score -- genuine: 63.1, forged: 37.8
ROC-AUC (risk score vs. forged label): 0.8264
Best achievable threshold accuracy: {'threshold': 67, 'accuracy': 0.875}
Accuracy at fixed threshold=55: 75.00%
Precision: 90.00%
Recall: 75.00%
F1: 81.82%
Localization mean IoU (n=36): 0.034
Average analysis latency: 3.853s

Metrics are computed on DocuVerify's own synthetic test split (held out by source document, no leakage). They characterize this prototype's classical-CV + OCR pipeline on synthetic renders, not performance on real-world scanned/photographed documents.
