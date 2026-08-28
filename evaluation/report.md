# Evaluation Report
Test set size: 48
Mean authenticity score -- genuine: 68.7, forged: 68.1
ROC-AUC (risk score vs. forged label): 0.5579
Best achievable threshold accuracy: {'threshold': 71, 'accuracy': 0.75}
Accuracy at fixed threshold=55: 25.00%
Precision: 0.00%
Recall: 0.00%
F1: 0.00%
Localization mean IoU (n=36): 0.034
Average analysis latency: 1.962s

Metrics are computed on DocuVerify's own synthetic test split (held out by source document, no leakage). They characterize this prototype's classical-CV + OCR pipeline on synthetic renders, not performance on real-world scanned/photographed documents.
