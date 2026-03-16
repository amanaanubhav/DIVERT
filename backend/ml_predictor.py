import numpy as np
from sklearn.ensemble import RandomForestRegressor

class ETA_Predictor:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=50, random_state=42)
        self._train_dummy_model()
        print("ML Model Initialized and Trained.")

    def _train_dummy_model(self):
        # Features: [distance_meters, congestion_index (0-10)]
        # Target: travel_time_seconds
        np.random.seed(42)
        X = np.random.rand(1000, 2)
        X[:, 0] *= 2000  # distances up to 2km
        X[:, 1] *= 10    # congestion 0-10
        
        # Base speed ~ 10m/s. Congestion adds significant delays.
        y = (X[:, 0] / 10) + (X[:, 1] * 15) + np.random.normal(0, 5, 1000)
        self.model.fit(X, y)

    def predict_eta(self, distance, congestion):
        return self.model.predict([[distance, congestion]])[0]

predictor = ETA_Predictor()