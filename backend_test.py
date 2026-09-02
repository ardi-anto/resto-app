"""
Backend API Testing for KedaiOps Coffee Shop POS System
Tests all core functionality including auth, ingredients, menus, sales, and reports
"""
import requests
import sys
import uuid
from datetime import datetime

class KedaiOpsAPITester:
    def __init__(self, base_url="https://coffee-stock-mate.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data = {
            'ingredients': [],
            'menus': [],
            'sales': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_login(self, email, password):
        """Test login and get token"""
        success, response = self.run_test(
            "Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "api/auth/me",
            200
        )
        if success:
            print(f"   User: {response.get('user', {}).get('name')} ({response.get('user', {}).get('role')})")
        return success

    def test_create_ingredient(self, name, unit, stock_qty, low_stock_threshold):
        """Create an ingredient"""
        success, response = self.run_test(
            f"Create Ingredient: {name}",
            "POST",
            "api/ingredients",
            200,
            data={
                "name": name,
                "unit": unit,
                "stock_qty": stock_qty,
                "low_stock_threshold": low_stock_threshold,
                "price_per_unit": 0
            }
        )
        if success and 'ingredient' in response:
            ingredient_id = response['ingredient']['_id']
            self.test_data['ingredients'].append({
                'id': ingredient_id,
                'name': name,
                'initial_stock': stock_qty
            })
            print(f"   Created ingredient ID: {ingredient_id}")
            return ingredient_id
        return None

    def test_list_ingredients(self):
        """List all ingredients"""
        success, response = self.run_test(
            "List Ingredients",
            "GET",
            "api/ingredients",
            200
        )
        if success:
            count = len(response.get('ingredients', []))
            print(f"   Found {count} ingredients")
        return success, response

    def test_create_menu(self, name, category, price, recipe):
        """Create a menu with recipe"""
        success, response = self.run_test(
            f"Create Menu: {name}",
            "POST",
            "api/menus",
            200,
            data={
                "name": name,
                "category": category,
                "price": price,
                "recipe": recipe,
                "is_active": True
            }
        )
        if success and 'menu' in response:
            menu_id = response['menu']['_id']
            self.test_data['menus'].append({
                'id': menu_id,
                'name': name,
                'price': price
            })
            print(f"   Created menu ID: {menu_id}")
            print(f"   Recipe: {len(recipe)} ingredients")
            return menu_id
        return None

    def test_list_menus(self):
        """List all menus"""
        success, response = self.run_test(
            "List Menus",
            "GET",
            "api/menus",
            200
        )
        if success:
            count = len(response.get('menus', []))
            print(f"   Found {count} menus")
        return success, response

    def test_create_sale(self, items, total, payment_method="cash"):
        """Create a sale transaction"""
        client_id = str(uuid.uuid4())
        success, response = self.run_test(
            "Create Sale (POS Transaction)",
            "POST",
            "api/sales",
            200,
            data={
                "client_id": client_id,
                "items": items,
                "total": total,
                "payment_method": payment_method,
                "device_id": "test-device"
            }
        )
        if success and 'sale' in response:
            sale_id = response['sale']['_id']
            self.test_data['sales'].append({
                'id': sale_id,
                'client_id': client_id,
                'total': total
            })
            print(f"   Created sale ID: {sale_id}")
            return sale_id
        return None

    def test_get_ingredient_stock(self, ingredient_id):
        """Get current stock of an ingredient"""
        success, response = self.run_test(
            "Get Ingredient Stock",
            "GET",
            "api/ingredients",
            200
        )
        if success:
            ingredients = response.get('ingredients', [])
            for ing in ingredients:
                if ing['_id'] == ingredient_id:
                    stock = ing['stock_qty']
                    print(f"   Current stock: {stock} {ing['unit']}")
                    return stock
        return None

    def test_reports_summary(self):
        """Get sales summary report"""
        success, response = self.run_test(
            "Get Reports Summary",
            "GET",
            "api/reports/summary",
            200
        )
        if success:
            print(f"   Total Revenue: Rp {response.get('total_revenue', 0):,.0f}")
            print(f"   Total Transactions: {response.get('total_transactions', 0)}")
            print(f"   Low Stock Items: {response.get('low_stock_count', 0)}")
        return success, response

    def test_low_stock_alert(self):
        """Test low stock alert functionality"""
        success, response = self.run_test(
            "Get Low Stock Ingredients",
            "GET",
            "api/ingredients",
            200,
            params={"low_stock_only": "true"}
        )
        if success:
            low_stock_items = response.get('ingredients', [])
            print(f"   Low stock items: {len(low_stock_items)}")
            for item in low_stock_items:
                print(f"   - {item['name']}: {item['stock_qty']} {item['unit']} (min: {item['low_stock_threshold']})")
        return success, response


def main():
    print("=" * 60)
    print("KedaiOps Coffee Shop POS - Backend API Testing")
    print("=" * 60)
    
    tester = KedaiOpsAPITester()
    
    # Test 1: Health Check
    print("\n" + "=" * 60)
    print("PHASE 1: HEALTH & AUTHENTICATION")
    print("=" * 60)
    
    if not tester.test_health():
        print("\n❌ Health check failed, stopping tests")
        return 1
    
    # Test 2: Login
    if not tester.test_login("admin@kedaiops.com", "admin123"):
        print("\n❌ Login failed, stopping tests")
        return 1
    
    # Test 3: Get current user
    tester.test_get_me()
    
    # Test 4: Create Ingredients
    print("\n" + "=" * 60)
    print("PHASE 2: INGREDIENTS MANAGEMENT")
    print("=" * 60)
    
    kopi_id = tester.test_create_ingredient("Kopi Arabica", "gram", 5000, 500)
    susu_id = tester.test_create_ingredient("Susu Segar", "ml", 3000, 500)
    gula_id = tester.test_create_ingredient("Gula Aren", "gram", 2000, 200)
    
    if not all([kopi_id, susu_id, gula_id]):
        print("\n❌ Failed to create ingredients, stopping tests")
        return 1
    
    # Test 5: List ingredients
    tester.test_list_ingredients()
    
    # Test 6: Create Menus with Recipes
    print("\n" + "=" * 60)
    print("PHASE 3: MENU MANAGEMENT")
    print("=" * 60)
    
    # Americano - uses only coffee
    americano_id = tester.test_create_menu(
        "Americano",
        "Kopi",
        25000,
        [{"ingredient_id": kopi_id, "qty": 18}]
    )
    
    # Kopi Susu Gula Aren - uses coffee, milk, and palm sugar
    kopi_susu_id = tester.test_create_menu(
        "Kopi Susu Gula Aren",
        "Kopi",
        30000,
        [
            {"ingredient_id": kopi_id, "qty": 18},
            {"ingredient_id": susu_id, "qty": 150},
            {"ingredient_id": gula_id, "qty": 20}
        ]
    )
    
    if not all([americano_id, kopi_susu_id]):
        print("\n❌ Failed to create menus, stopping tests")
        return 1
    
    # Test 7: List menus
    tester.test_list_menus()
    
    # Test 8: Record initial stock
    print("\n" + "=" * 60)
    print("PHASE 4: STOCK VERIFICATION (BEFORE SALE)")
    print("=" * 60)
    
    kopi_stock_before = tester.test_get_ingredient_stock(kopi_id)
    susu_stock_before = tester.test_get_ingredient_stock(susu_id)
    gula_stock_before = tester.test_get_ingredient_stock(gula_id)
    
    # Test 9: Create Sale (POS Transaction)
    print("\n" + "=" * 60)
    print("PHASE 5: POS TRANSACTION")
    print("=" * 60)
    
    # Sell 2 Americano and 1 Kopi Susu Gula Aren
    sale_items = [
        {
            "menu_id": americano_id,
            "menu_name": "Americano",
            "qty": 2,
            "price": 25000,
            "subtotal": 50000
        },
        {
            "menu_id": kopi_susu_id,
            "menu_name": "Kopi Susu Gula Aren",
            "qty": 1,
            "price": 30000,
            "subtotal": 30000
        }
    ]
    
    sale_id = tester.test_create_sale(sale_items, 80000, "cash")
    
    if not sale_id:
        print("\n❌ Failed to create sale, stopping tests")
        return 1
    
    # Test 10: Verify stock deduction
    print("\n" + "=" * 60)
    print("PHASE 6: STOCK VERIFICATION (AFTER SALE)")
    print("=" * 60)
    
    print("\n📊 Stock Deduction Verification:")
    print(f"   Expected deductions:")
    print(f"   - Kopi Arabica: 2*18 + 1*18 = 54 gram")
    print(f"   - Susu Segar: 1*150 = 150 ml")
    print(f"   - Gula Aren: 1*20 = 20 gram")
    
    kopi_stock_after = tester.test_get_ingredient_stock(kopi_id)
    susu_stock_after = tester.test_get_ingredient_stock(susu_id)
    gula_stock_after = tester.test_get_ingredient_stock(gula_id)
    
    # Verify deductions
    stock_verification_passed = True
    if kopi_stock_before is not None and kopi_stock_after is not None:
        expected_kopi = kopi_stock_before - 54
        if abs(kopi_stock_after - expected_kopi) < 0.01:
            print(f"✅ Kopi stock correctly deducted: {kopi_stock_before} → {kopi_stock_after}")
        else:
            print(f"❌ Kopi stock mismatch: expected {expected_kopi}, got {kopi_stock_after}")
            stock_verification_passed = False
    
    if susu_stock_before is not None and susu_stock_after is not None:
        expected_susu = susu_stock_before - 150
        if abs(susu_stock_after - expected_susu) < 0.01:
            print(f"✅ Susu stock correctly deducted: {susu_stock_before} → {susu_stock_after}")
        else:
            print(f"❌ Susu stock mismatch: expected {expected_susu}, got {susu_stock_after}")
            stock_verification_passed = False
    
    if gula_stock_before is not None and gula_stock_after is not None:
        expected_gula = gula_stock_before - 20
        if abs(gula_stock_after - expected_gula) < 0.01:
            print(f"✅ Gula stock correctly deducted: {gula_stock_before} → {gula_stock_after}")
        else:
            print(f"❌ Gula stock mismatch: expected {expected_gula}, got {gula_stock_after}")
            stock_verification_passed = False
    
    # Test 11: Reports
    print("\n" + "=" * 60)
    print("PHASE 7: REPORTS & ANALYTICS")
    print("=" * 60)
    
    tester.test_reports_summary()
    
    # Test 12: Low Stock Alert
    print("\n" + "=" * 60)
    print("PHASE 8: LOW STOCK ALERTS")
    print("=" * 60)
    
    tester.test_low_stock_alert()
    
    # Final Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"✅ Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if not stock_verification_passed:
        print("\n⚠️  WARNING: Stock deduction verification failed!")
        print("   The core feature (recipe-based stock deduction) is not working correctly.")
    
    if tester.tests_passed == tester.tests_run and stock_verification_passed:
        print("\n🎉 All tests passed! Backend is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {tester.tests_run - tester.tests_passed} test(s) failed.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
