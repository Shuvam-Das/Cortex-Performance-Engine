from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import time
import random
import logging
from pythonjsonlogger import jsonlogger

# --- Structured Logging Setup ---
logger = logging.getLogger()
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter('%(asctime)s %(name)s %(levelname)s %(message)s')
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)

app = FastAPI()

class Product(BaseModel):
    id: int
    name: string
    price: float

class CartItem(BaseModel):
    product_id: int
    quantity: int

@app.get("/")
def read_root():
    logger.info("Root endpoint was accessed.")
    return {"message": "Welcome to the E-Commerce API"}

@app.get("/products/{product_id}")
def get_product(product_id: int):
    # Simulate a database lookup
    time.sleep(random.uniform(0.05, 0.2))
    if product_id > 1000:
        logger.warning(f"Product lookup for non-existent ID: {product_id}")
        raise HTTPException(status_code=404, detail="Product not found")
    
    logger.info(f"Product {product_id} was retrieved successfully.")
    return {"product_id": product_id, "name": f"Product Name {product_id}", "price": round(random.uniform(10.0, 100.0), 2)}

@app.post("/cart")
def add_to_cart(item: CartItem):
    # Simulate adding to a cart, which might be slower
    time.sleep(random.uniform(0.1, 0.4))
    logger.info(f"Added {item.quantity} of product {item.product_id} to cart.")
    return {"status": "success", "item_added": item}

@app.post("/checkout")
def checkout():
    # Simulate a slow checkout process that sometimes fails
    time.sleep(random.uniform(0.3, 1.0))
    if random.random() < 0.1: # 10% chance of failure
        logger.error("Checkout failed due to a simulated payment gateway error.")
        raise HTTPException(status_code=500, detail="Payment gateway error")

    logger.info("Checkout process completed successfully.")
    return {"status": "checkout_successful"}