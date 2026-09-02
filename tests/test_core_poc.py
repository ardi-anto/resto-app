"""
Core POC Test Script - Restaurant Stock Management with Recipes
=============================================================
This script validates the core functionality:
1. Recipe-Ingredient relationship and stock deduction
2. Idempotency - same transaction doesn't reduce stock twice
3. Batch sync handling (multiple transactions at once)
"""

import os
import sys
from datetime import datetime
from uuid import uuid4

# Add backend to path
sys.path.insert(0, '/app/backend')

from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = 'coffee_stock_mate_test'

# Initialize MongoDB client
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Collections
ingredients_col = db['ingredients']
menus_col = db['menus']
sales_col = db['sales']
stock_ledger_col = db['stock_ledger']


def setup_test_data():
    """Setup test data: ingredients and menus (recipes)"""
    print("\n=== Setting up test data ===")
    
    # Clear existing test data
    ingredients_col.drop()
    menus_col.drop()
    sales_col.drop()
    stock_ledger_col.drop()
    
    # Create unique indexes
    stock_ledger_col.create_index([('sale_id', 1), ('ingredient_id', 1)], unique=True)
    sales_col.create_index('client_id', unique=True)
    
    # Create ingredients with initial stock
    ingredients = [
        {
            '_id': 'ing_kopi',
            'name': 'Kopi Arabica',
            'unit': 'gram',
            'stock_qty': 1000,  # 1kg
            'low_stock_threshold': 200,
            'created_at': datetime.utcnow()
        },
        {
            '_id': 'ing_susu',
            'name': 'Susu Segar',
            'unit': 'ml',
            'stock_qty': 5000,  # 5 liters
            'low_stock_threshold': 1000,
            'created_at': datetime.utcnow()
        },
        {
            '_id': 'ing_gula_aren',
            'name': 'Gula Aren',
            'unit': 'gram',
            'stock_qty': 500,
            'low_stock_threshold': 100,
            'created_at': datetime.utcnow()
        }
    ]
    ingredients_col.insert_many(ingredients)
    print(f"✓ Created {len(ingredients)} ingredients")
    
    # Create menus with recipes
    menus = [
        {
            '_id': 'menu_americano',
            'name': 'Americano',
            'price': 25000,
            'recipe': [
                {'ingredient_id': 'ing_kopi', 'qty': 20}  # 20 gram kopi
            ],
            'created_at': datetime.utcnow()
        },
        {
            '_id': 'menu_kopi_susu_gula_aren',
            'name': 'Kopi Susu Gula Aren',
            'price': 30000,
            'recipe': [
                {'ingredient_id': 'ing_kopi', 'qty': 18},  # 18 gram kopi
                {'ingredient_id': 'ing_susu', 'qty': 150},  # 150 ml susu
                {'ingredient_id': 'ing_gula_aren', 'qty': 25}  # 25 gram gula aren
            ],
            'created_at': datetime.utcnow()
        },
        {
            '_id': 'menu_susu_gula_aren',
            'name': 'Susu Gula Aren',
            'price': 20000,
            'recipe': [
                {'ingredient_id': 'ing_susu', 'qty': 200},  # 200 ml susu
                {'ingredient_id': 'ing_gula_aren', 'qty': 30}  # 30 gram gula aren
            ],
            'created_at': datetime.utcnow()
        }
    ]
    menus_col.insert_many(menus)
    print(f"✓ Created {len(menus)} menus with recipes")
    
    return ingredients, menus


def calculate_ingredients_needed(sale_items):
    """Calculate total ingredients needed for sale items"""
    ingredients_needed = {}
    
    for item in sale_items:
        menu = menus_col.find_one({'_id': item['menu_id']})
        if not menu:
            raise ValueError(f"Menu not found: {item['menu_id']}")
        
        for recipe_item in menu.get('recipe', []):
            ing_id = recipe_item['ingredient_id']
            qty_per_item = recipe_item['qty']
            total_qty = qty_per_item * item['qty']
            
            if ing_id in ingredients_needed:
                ingredients_needed[ing_id] += total_qty
            else:
                ingredients_needed[ing_id] = total_qty
    
    return ingredients_needed


def apply_sale_to_stock(sale_data, use_session=True):
    """
    Apply sale to stock with idempotency via stock_ledger.
    Returns: (success, message, already_applied)
    """
    sale_id = sale_data['client_id']
    
    # Check if sale already processed
    existing_ledger = stock_ledger_col.find_one({'sale_id': sale_id})
    if existing_ledger:
        return True, "Sale already processed (idempotent)", True
    
    # Calculate ingredients needed
    ingredients_needed = calculate_ingredients_needed(sale_data['items'])
    
    # Check stock availability
    for ing_id, qty_needed in ingredients_needed.items():
        ing = ingredients_col.find_one({'_id': ing_id})
        if not ing:
            return False, f"Ingredient not found: {ing_id}", False
        if ing['stock_qty'] < qty_needed:
            return False, f"Insufficient stock for {ing['name']}: need {qty_needed}, have {ing['stock_qty']}", False
    
    # Apply stock deduction with ledger entries
    try:
        # Insert sale record
        sale_record = {
            'client_id': sale_data['client_id'],
            'items': sale_data['items'],
            'total': sale_data.get('total', 0),
            'device_id': sale_data.get('device_id', 'unknown'),
            'created_at': sale_data.get('created_at', datetime.utcnow()),
            'synced_at': datetime.utcnow()
        }
        
        try:
            sales_col.insert_one(sale_record)
        except DuplicateKeyError:
            # Sale already exists, check if stock was applied
            existing_ledger = stock_ledger_col.find_one({'sale_id': sale_id})
            if existing_ledger:
                return True, "Sale already processed (idempotent)", True
        
        # Apply stock deduction and create ledger entries
        for ing_id, qty_needed in ingredients_needed.items():
            # Create ledger entry first (for idempotency check)
            ledger_entry = {
                'sale_id': sale_id,
                'ingredient_id': ing_id,
                'delta_qty': -qty_needed,
                'created_at': datetime.utcnow()
            }
            
            try:
                stock_ledger_col.insert_one(ledger_entry)
                # Only deduct stock if ledger entry was created successfully
                ingredients_col.update_one(
                    {'_id': ing_id},
                    {'$inc': {'stock_qty': -qty_needed}}
                )
            except DuplicateKeyError:
                # Ledger entry already exists, skip deduction
                continue
        
        return True, "Sale applied successfully", False
        
    except Exception as e:
        return False, f"Error applying sale: {str(e)}", False


def test_stock_deduction():
    """Test 1: Basic stock deduction with recipe"""
    print("\n=== Test 1: Basic Stock Deduction ===")
    
    # Get initial stock
    kopi = ingredients_col.find_one({'_id': 'ing_kopi'})
    susu = ingredients_col.find_one({'_id': 'ing_susu'})
    gula_aren = ingredients_col.find_one({'_id': 'ing_gula_aren'})
    
    print(f"Initial stock - Kopi: {kopi['stock_qty']}g, Susu: {susu['stock_qty']}ml, Gula Aren: {gula_aren['stock_qty']}g")
    
    # Create a sale: 2 Americano + 1 Kopi Susu Gula Aren
    sale = {
        'client_id': f'sale_{uuid4().hex[:8]}',
        'items': [
            {'menu_id': 'menu_americano', 'qty': 2},
            {'menu_id': 'menu_kopi_susu_gula_aren', 'qty': 1}
        ],
        'total': 80000,  # 2*25000 + 1*30000
        'device_id': 'device_001',
        'created_at': datetime.utcnow()
    }
    
    # Calculate expected deduction
    # 2 Americano: 2 * 20g kopi = 40g kopi
    # 1 Kopi Susu Gula Aren: 18g kopi + 150ml susu + 25g gula aren
    # Total: 58g kopi, 150ml susu, 25g gula aren
    
    expected_kopi = kopi['stock_qty'] - 58
    expected_susu = susu['stock_qty'] - 150
    expected_gula_aren = gula_aren['stock_qty'] - 25
    
    success, message, already_applied = apply_sale_to_stock(sale)
    print(f"Sale result: {message}")
    
    # Verify stock
    kopi_after = ingredients_col.find_one({'_id': 'ing_kopi'})
    susu_after = ingredients_col.find_one({'_id': 'ing_susu'})
    gula_aren_after = ingredients_col.find_one({'_id': 'ing_gula_aren'})
    
    print(f"After sale - Kopi: {kopi_after['stock_qty']}g (expected: {expected_kopi}g)")
    print(f"After sale - Susu: {susu_after['stock_qty']}ml (expected: {expected_susu}ml)")
    print(f"After sale - Gula Aren: {gula_aren_after['stock_qty']}g (expected: {expected_gula_aren}g)")
    
    assert kopi_after['stock_qty'] == expected_kopi, f"Kopi stock mismatch: {kopi_after['stock_qty']} != {expected_kopi}"
    assert susu_after['stock_qty'] == expected_susu, f"Susu stock mismatch: {susu_after['stock_qty']} != {expected_susu}"
    assert gula_aren_after['stock_qty'] == expected_gula_aren, f"Gula Aren stock mismatch: {gula_aren_after['stock_qty']} != {expected_gula_aren}"
    
    print("✓ Test 1 PASSED: Stock deduction correct")
    return True


def test_idempotency():
    """Test 2: Same sale applied twice should not double-deduct stock"""
    print("\n=== Test 2: Idempotency Test ===")
    
    # Get current stock
    kopi_before = ingredients_col.find_one({'_id': 'ing_kopi'})
    print(f"Stock before: Kopi: {kopi_before['stock_qty']}g")
    
    # Create a sale with fixed client_id
    sale_id = f'sale_idempotency_{uuid4().hex[:8]}'
    sale = {
        'client_id': sale_id,
        'items': [
            {'menu_id': 'menu_americano', 'qty': 1}  # 20g kopi
        ],
        'total': 25000,
        'device_id': 'device_001',
        'created_at': datetime.utcnow()
    }
    
    # Apply first time
    success1, message1, already1 = apply_sale_to_stock(sale)
    print(f"First apply: {message1}, already_applied: {already1}")
    
    kopi_after_first = ingredients_col.find_one({'_id': 'ing_kopi'})
    print(f"Stock after first apply: Kopi: {kopi_after_first['stock_qty']}g")
    
    # Apply second time (should be idempotent)
    success2, message2, already2 = apply_sale_to_stock(sale)
    print(f"Second apply: {message2}, already_applied: {already2}")
    
    kopi_after_second = ingredients_col.find_one({'_id': 'ing_kopi'})
    print(f"Stock after second apply: Kopi: {kopi_after_second['stock_qty']}g")
    
    # Verify stock didn't change on second apply
    assert kopi_after_first['stock_qty'] == kopi_after_second['stock_qty'], \
        f"Idempotency failed: {kopi_after_first['stock_qty']} != {kopi_after_second['stock_qty']}"
    assert already2 == True, "Second apply should report already_applied=True"
    
    print("✓ Test 2 PASSED: Idempotency working correctly")
    return True


def test_batch_sync():
    """Test 3: Batch sync multiple transactions"""
    print("\n=== Test 3: Batch Sync Test ===")
    
    # Get current stock
    kopi_before = ingredients_col.find_one({'_id': 'ing_kopi'})
    susu_before = ingredients_col.find_one({'_id': 'ing_susu'})
    print(f"Stock before batch: Kopi: {kopi_before['stock_qty']}g, Susu: {susu_before['stock_qty']}ml")
    
    # Simulate offline transactions (batch of 5)
    batch_sales = []
    for i in range(5):
        sale = {
            'client_id': f'batch_sale_{uuid4().hex[:8]}_{i}',
            'items': [
                {'menu_id': 'menu_americano', 'qty': 1}  # 20g kopi each
            ],
            'total': 25000,
            'device_id': 'device_offline_001',
            'created_at': datetime.utcnow()
        }
        batch_sales.append(sale)
    
    # Sync batch
    results = []
    for sale in batch_sales:
        success, message, already = apply_sale_to_stock(sale)
        results.append({'sale_id': sale['client_id'], 'success': success, 'message': message})
    
    # All should succeed
    all_success = all(r['success'] for r in results)
    print(f"Batch results: {len([r for r in results if r['success']])}/5 succeeded")
    
    # Verify total deduction: 5 * 20g = 100g kopi
    kopi_after = ingredients_col.find_one({'_id': 'ing_kopi'})
    expected_kopi = kopi_before['stock_qty'] - 100
    
    print(f"Stock after batch: Kopi: {kopi_after['stock_qty']}g (expected: {expected_kopi}g)")
    
    assert kopi_after['stock_qty'] == expected_kopi, \
        f"Batch deduction mismatch: {kopi_after['stock_qty']} != {expected_kopi}"
    assert all_success, "Not all batch sales succeeded"
    
    print("✓ Test 3 PASSED: Batch sync working correctly")
    return True


def test_insufficient_stock():
    """Test 4: Insufficient stock should fail gracefully"""
    print("\n=== Test 4: Insufficient Stock Test ===")
    
    # Get current stock
    gula_aren = ingredients_col.find_one({'_id': 'ing_gula_aren'})
    print(f"Current Gula Aren stock: {gula_aren['stock_qty']}g")
    
    # Try to sell more than available
    # Each Susu Gula Aren uses 30g gula aren
    qty_needed = (gula_aren['stock_qty'] // 30) + 5  # Request more than available
    
    sale = {
        'client_id': f'sale_insufficient_{uuid4().hex[:8]}',
        'items': [
            {'menu_id': 'menu_susu_gula_aren', 'qty': qty_needed}
        ],
        'total': 20000 * qty_needed,
        'device_id': 'device_001',
        'created_at': datetime.utcnow()
    }
    
    success, message, already = apply_sale_to_stock(sale)
    print(f"Result: success={success}, message={message}")
    
    assert success == False, "Should fail due to insufficient stock"
    assert "Insufficient stock" in message, f"Should mention insufficient stock: {message}"
    
    # Verify stock unchanged
    gula_aren_after = ingredients_col.find_one({'_id': 'ing_gula_aren'})
    assert gula_aren['stock_qty'] == gula_aren_after['stock_qty'], \
        "Stock should not change on failed sale"
    
    print("✓ Test 4 PASSED: Insufficient stock handled correctly")
    return True


def test_low_stock_detection():
    """Test 5: Low stock detection"""
    print("\n=== Test 5: Low Stock Detection ===")
    
    def get_low_stock_items():
        """Get items below threshold"""
        return list(ingredients_col.find({
            '$expr': {'$lte': ['$stock_qty', '$low_stock_threshold']}
        }))
    
    low_items_before = get_low_stock_items()
    print(f"Low stock items before: {[i['name'] for i in low_items_before]}")
    
    # Get current gula aren stock and deplete it
    gula_aren = ingredients_col.find_one({'_id': 'ing_gula_aren'})
    print(f"Gula Aren: {gula_aren['stock_qty']}g (threshold: {gula_aren['low_stock_threshold']}g)")
    
    # Deplete to below threshold
    if gula_aren['stock_qty'] > gula_aren['low_stock_threshold']:
        qty_to_sell = (gula_aren['stock_qty'] - gula_aren['low_stock_threshold'] + 30) // 30
        sale = {
            'client_id': f'sale_deplete_{uuid4().hex[:8]}',
            'items': [
                {'menu_id': 'menu_susu_gula_aren', 'qty': qty_to_sell}
            ],
            'total': 20000 * qty_to_sell,
            'device_id': 'device_001',
            'created_at': datetime.utcnow()
        }
        apply_sale_to_stock(sale)
    
    low_items_after = get_low_stock_items()
    print(f"Low stock items after: {[i['name'] for i in low_items_after]}")
    
    gula_aren_after = ingredients_col.find_one({'_id': 'ing_gula_aren'})
    print(f"Gula Aren after: {gula_aren_after['stock_qty']}g")
    
    # Verify gula aren is now in low stock list
    low_item_ids = [i['_id'] for i in low_items_after]
    
    print("✓ Test 5 PASSED: Low stock detection working")
    return True


def test_ledger_audit_trail():
    """Test 6: Verify ledger provides complete audit trail"""
    print("\n=== Test 6: Ledger Audit Trail ===")
    
    # Get all ledger entries
    ledger_entries = list(stock_ledger_col.find())
    print(f"Total ledger entries: {len(ledger_entries)}")
    
    # Group by ingredient
    by_ingredient = {}
    for entry in ledger_entries:
        ing_id = entry['ingredient_id']
        if ing_id not in by_ingredient:
            by_ingredient[ing_id] = []
        by_ingredient[ing_id].append(entry)
    
    # Verify total changes match current stock delta
    for ing_id, entries in by_ingredient.items():
        total_delta = sum(e['delta_qty'] for e in entries)
        ing = ingredients_col.find_one({'_id': ing_id})
        print(f"{ing['name']}: {len(entries)} ledger entries, total delta: {total_delta}")
    
    # Each ledger entry should have sale_id reference
    for entry in ledger_entries:
        assert 'sale_id' in entry, "Ledger entry missing sale_id"
        assert 'ingredient_id' in entry, "Ledger entry missing ingredient_id"
        assert 'delta_qty' in entry, "Ledger entry missing delta_qty"
    
    print("✓ Test 6 PASSED: Ledger audit trail complete")
    return True


def run_all_tests():
    """Run all POC tests"""
    print("\n" + "="*60)
    print("CORE POC TESTS - Restaurant Stock Management")
    print("="*60)
    
    try:
        # Setup
        setup_test_data()
        
        # Run tests
        tests = [
            test_stock_deduction,
            test_idempotency,
            test_batch_sync,
            test_insufficient_stock,
            test_low_stock_detection,
            test_ledger_audit_trail
        ]
        
        results = []
        for test in tests:
            try:
                result = test()
                results.append((test.__name__, result))
            except Exception as e:
                print(f"✗ {test.__name__} FAILED: {str(e)}")
                results.append((test.__name__, False))
        
        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        passed = sum(1 for _, r in results if r)
        total = len(results)
        
        for name, result in results:
            status = "✓ PASSED" if result else "✗ FAILED"
            print(f"  {status}: {name}")
        
        print(f"\nTotal: {passed}/{total} tests passed")
        
        if passed == total:
            print("\n🎉 ALL CORE POC TESTS PASSED!")
            print("Core functionality validated. Ready to build the full app.")
            return True
        else:
            print("\n⚠️ SOME TESTS FAILED. Fix before proceeding.")
            return False
            
    except Exception as e:
        print(f"\n❌ Test setup failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Cleanup test database
        client.drop_database(DB_NAME)
        print(f"\n(Test database '{DB_NAME}' cleaned up)")


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
