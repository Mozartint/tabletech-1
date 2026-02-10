import requests
import sys
import json
from datetime import datetime

class QRRestaurantAPITester:
    def __init__(self, base_url="https://tabletech-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.owner_token = None
        self.kitchen_token = None
        self.cashier_token = None
        self.restaurant_id = None
        self.table_id = None
        self.category_id = None
        self.menu_item_id = None
        self.order_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@qr-restaurant.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"Admin token obtained: {self.admin_token[:20]}...")
            return True
        return False

    def test_create_restaurant(self):
        """Test restaurant creation by admin"""
        restaurant_data = {
            "name": "Test Restaurant",
            "address": "Test Address 123",
            "phone": "+90 555 123 4567",
            "owner_email": "owner@test.com",
            "owner_password": "owner123",
            "owner_full_name": "Test Owner"
        }
        
        success, response = self.run_test(
            "Create Restaurant",
            "POST",
            "admin/restaurants",
            200,
            data=restaurant_data,
            token=self.admin_token
        )
        if success and 'id' in response:
            self.restaurant_id = response['id']
            print(f"Restaurant created with ID: {self.restaurant_id}")
            return True
        return False

    def test_owner_login(self):
        """Test owner login"""
        success, response = self.run_test(
            "Owner Login",
            "POST",
            "auth/login",
            200,
            data={"email": "owner@test.com", "password": "owner123"}
        )
        if success and 'access_token' in response:
            self.owner_token = response['access_token']
            print(f"Owner token obtained: {self.owner_token[:20]}...")
            return True
        return False

    def test_create_menu_category(self):
        """Test menu category creation"""
        category_data = {
            "name": "Ana Yemekler",
            "order": 1
        }
        
        success, response = self.run_test(
            "Create Menu Category",
            "POST",
            "owner/menu/categories",
            200,
            data=category_data,
            token=self.owner_token
        )
        if success and 'id' in response:
            self.category_id = response['id']
            print(f"Category created with ID: {self.category_id}")
            return True
        return False

    def test_create_menu_item(self):
        """Test menu item creation"""
        item_data = {
            "category_id": self.category_id,
            "name": "Test Burger",
            "description": "Delicious test burger",
            "price": 25.50,
            "image_url": "https://images.unsplash.com/photo-1630852009278-6cc36322ddfc?crop=entropy&cs=srgb&fm=jpg&q=85",
            "available": True
        }
        
        success, response = self.run_test(
            "Create Menu Item",
            "POST",
            "owner/menu/items",
            200,
            data=item_data,
            token=self.owner_token
        )
        if success and 'id' in response:
            self.menu_item_id = response['id']
            print(f"Menu item created with ID: {self.menu_item_id}")
            return True
        return False

    def test_create_table(self):
        """Test table creation with QR code generation"""
        table_data = {
            "table_number": "1"
        }
        
        success, response = self.run_test(
            "Create Table",
            "POST",
            "owner/tables",
            200,
            data=table_data,
            token=self.owner_token
        )
        if success and 'id' in response:
            self.table_id = response['id']
            print(f"Table created with ID: {self.table_id}")
            if 'qr_code' in response and response['qr_code'].startswith('data:image/png;base64,'):
                print("✅ QR code generated successfully")
                return True
            else:
                print("❌ QR code not generated properly")
                return False
        return False

    def test_get_menu_by_table(self):
        """Test getting menu by table ID (public endpoint)"""
        success, response = self.run_test(
            "Get Menu by Table",
            "GET",
            f"menu/{self.table_id}",
            200
        )
        if success:
            required_keys = ['restaurant', 'table', 'categories', 'items']
            if all(key in response for key in required_keys):
                print("✅ Menu data structure is correct")
                return True
            else:
                print("❌ Menu data structure is incomplete")
                return False
        return False

    def test_create_order(self):
        """Test order creation (customer placing order)"""
        order_data = {
            "table_id": self.table_id,
            "items": [
                {
                    "menu_item_id": self.menu_item_id,
                    "name": "Test Burger",
                    "price": 25.50,
                    "quantity": 2
                }
            ],
            "payment_method": "cash"
        }
        
        success, response = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data=order_data
        )
        if success and 'id' in response:
            self.order_id = response['id']
            print(f"Order created with ID: {self.order_id}")
            return True
        return False

    def test_register_kitchen_user(self):
        """Test registering kitchen user by admin"""
        kitchen_data = {
            "email": "kitchen@test.com",
            "password": "kitchen123",
            "full_name": "Kitchen Staff",
            "role": "kitchen",
            "restaurant_id": self.restaurant_id
        }
        
        success, response = self.run_test(
            "Register Kitchen User",
            "POST",
            "auth/register",
            200,
            data=kitchen_data,
            token=self.admin_token
        )
        return success

    def test_kitchen_login(self):
        """Test kitchen user login"""
        success, response = self.run_test(
            "Kitchen Login",
            "POST",
            "auth/login",
            200,
            data={"email": "kitchen@test.com", "password": "kitchen123"}
        )
        if success and 'access_token' in response:
            self.kitchen_token = response['access_token']
            print(f"Kitchen token obtained: {self.kitchen_token[:20]}...")
            return True
        return False

    def test_kitchen_get_orders(self):
        """Test kitchen getting orders"""
        success, response = self.run_test(
            "Kitchen Get Orders",
            "GET",
            "kitchen/orders",
            200,
            token=self.kitchen_token
        )
        if success:
            print(f"Kitchen found {len(response)} orders")
            return True
        return False

    def test_kitchen_update_order_status(self):
        """Test kitchen updating order status"""
        success, response = self.run_test(
            "Kitchen Update Order Status",
            "PUT",
            f"kitchen/orders/{self.order_id}/status",
            200,
            data={"status": "preparing"},
            token=self.kitchen_token
        )
        return success

    def test_register_cashier_user(self):
        """Test registering cashier user by admin"""
        cashier_data = {
            "email": "cashier@test.com",
            "password": "cashier123",
            "full_name": "Cashier Staff",
            "role": "cashier",
            "restaurant_id": self.restaurant_id
        }
        
        success, response = self.run_test(
            "Register Cashier User",
            "POST",
            "auth/register",
            200,
            data=cashier_data,
            token=self.admin_token
        )
        return success

    def test_cashier_login(self):
        """Test cashier user login"""
        success, response = self.run_test(
            "Cashier Login",
            "POST",
            "auth/login",
            200,
            data={"email": "cashier@test.com", "password": "cashier123"}
        )
        if success and 'access_token' in response:
            self.cashier_token = response['access_token']
            print(f"Cashier token obtained: {self.cashier_token[:20]}...")
            return True
        return False

    def test_cashier_get_orders(self):
        """Test cashier getting cash payment orders"""
        success, response = self.run_test(
            "Cashier Get Orders",
            "GET",
            "cashier/orders",
            200,
            token=self.cashier_token
        )
        if success:
            print(f"Cashier found {len(response)} cash payment orders")
            return True
        return False

    def test_cashier_update_payment(self):
        """Test cashier updating payment status"""
        success, response = self.run_test(
            "Cashier Update Payment",
            "PUT",
            f"cashier/orders/{self.order_id}/payment",
            200,
            data={"payment_status": "paid"},
            token=self.cashier_token
        )
        return success

    def test_owner_get_all_orders(self):
        """Test owner getting all orders"""
        success, response = self.run_test(
            "Owner Get All Orders",
            "GET",
            "owner/orders",
            200,
            token=self.owner_token
        )
        if success:
            print(f"Owner found {len(response)} total orders")
            return True
        return False

def main():
    print("🚀 Starting QR Restaurant System API Tests")
    print("=" * 50)
    
    tester = QRRestaurantAPITester()
    
    # Test sequence
    test_sequence = [
        ("Admin Login", tester.test_admin_login),
        ("Create Restaurant", tester.test_create_restaurant),
        ("Owner Login", tester.test_owner_login),
        ("Create Menu Category", tester.test_create_menu_category),
        ("Create Menu Item", tester.test_create_menu_item),
        ("Create Table with QR", tester.test_create_table),
        ("Get Menu by Table (Public)", tester.test_get_menu_by_table),
        ("Create Order (Customer)", tester.test_create_order),
        ("Register Kitchen User", tester.test_register_kitchen_user),
        ("Kitchen Login", tester.test_kitchen_login),
        ("Kitchen Get Orders", tester.test_kitchen_get_orders),
        ("Kitchen Update Order Status", tester.test_kitchen_update_order_status),
        ("Register Cashier User", tester.test_register_cashier_user),
        ("Cashier Login", tester.test_cashier_login),
        ("Cashier Get Orders", tester.test_cashier_get_orders),
        ("Cashier Update Payment", tester.test_cashier_update_payment),
        ("Owner Get All Orders", tester.test_owner_get_all_orders)
    ]
    
    failed_tests = []
    
    for test_name, test_func in test_sequence:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if not test_func():
                failed_tests.append(test_name)
                print(f"❌ {test_name} FAILED - Stopping dependent tests")
                # Don't break completely, continue with independent tests
        except Exception as e:
            print(f"❌ {test_name} ERROR: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print(f"\n{'='*50}")
    print(f"📊 Test Results:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print(f"\n✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())