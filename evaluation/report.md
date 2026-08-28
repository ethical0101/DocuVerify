# Evaluation Report
Test set size: 48
Mean authenticity score -- genuine: 73.7, forged: 75.5
ROC-AUC (risk score vs. forged label): 0.4907
Best achievable threshold accuracy: {'threshold': 97, 'accuracy': 0.75}
Accuracy at fixed threshold=55: 25.00%
Precision: 0.00%
Recall: 0.00%
F1: 0.00%
Localization mean IoU (n=32): 0.038
Average analysis latency: 3.164s

Metrics are computed on DocuVerify's own synthetic test split (held out by source document, no leakage). They characterize this prototype's classical-CV + OCR pipeline on synthetic renders, not performance on real-world scanned/photographed documents.
