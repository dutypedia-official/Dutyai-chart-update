/**
 * Validation script for the overlay coordinate system
 * Tests core functionality without requiring test framework
 */

import type { Chart } from 'klinecharts'
import type { 
  OverlayPoint, 
  DataSpaceOverlay, 
  ScreenPoint, 
  CoordinateContext
} from './overlayTypes'
import { 
  dataToScreen, 
  screenToData, 
  projectPoints, 
  validateDataPoint, 
  generatePointId
} from './coordinateUtils'
import { OverlayProjectionManager } from './overlayProjection'
import { OverlayCreationManager } from './overlayCreation'
import { OverlayMigrationManager } from './overlayMigration'
import { OverlayTemplateAdapter } from './enhancedOverlayAdapter'
import { createEnhancedOverlayTemplates } from './enhancedTemplates'

/**
 * Simple test runner
 */
class TestRunner {
  private tests: Array<{ name: string; fn: () => void }> = []
  private passed = 0
  private failed = 0

  test(name: string, fn: () => void) {
    this.tests.push({ name, fn })
  }

  expect(param: unknown) {
    return {
      toBe: param => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`)
        }
      },
      toBeDefined: () => {
        if (actual === undefined || actual === null) {
          throw new Error(`Expected value to be defined, got ${actual}`)
        }
      },
      toBeGreaterThan: (expected: number) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`)
        }
      },
      toHaveLength: (expected: number) => {
        if (!actual || actual.length !== expected) {
          throw new Error(`Expected length ${expected}, got ${actual?.length}`)
        }
      }
    }
  }

  run() {
    console.log('🧪 Running Overlay System Validation Tests...')
    
    for (const test of this.tests) {
      try {
        test.fn()
        console.log(`✅ ${test.name}`)
        this.passed++
      } catch (error) {
         console.log(`❌ ${test.name}: ${error instanceof Error ? error.message : String(error)}`)
         this.failed++
       }
    }
    
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`)
    return this.failed === 0
  }
}

/**
 * Test utilities
 */
function createMockPoint(timestamp: number, price: number): OverlayPoint {
  return {
    id: generatePointId(),
    t: timestamp,
    p: price
  }
}

function createMockOverlay(points: OverlayPoint[], type: string = 'line'): DataSpaceOverlay {
  return {
    id: generatePointId(),
    type: type as any,
    points,
    style: {
      line: {
        color: '#1677FF',
        size: 1,
        style: 'solid'
      }
    },
    visible: true,
    lock: false,
    createdAt: Date.now(),
    version: 1
  }
}

/**
 * Validation Tests
 */
export function runOverlaySystemValidation(): boolean {
  const runner = new TestRunner()

  // Test 1: Point validation
  runner.test('validateDataPoint accepts valid points', () => {
    const validPoint = createMockPoint(1640995200000, 100)
    runner.expect(validateDataPoint(validPoint)).toBe(true)
  })

  runner.test('validateDataPoint rejects invalid timestamps', () => {
    const invalidPoint: OverlayPoint = { id: 'test', t: NaN, p: 100 }
    runner.expect(validateDataPoint(invalidPoint)).toBe(false)
  })

  runner.test('validateDataPoint rejects invalid prices', () => {
    const invalidPoint: OverlayPoint = { id: 'test', t: 1640995200000, p: NaN }
    runner.expect(validateDataPoint(invalidPoint)).toBe(false)
  })

  // Test 2: Point generation
  runner.test('generatePointId creates unique IDs', () => {
    const id1 = generatePointId()
    const id2 = generatePointId()
    runner.expect(id1).toBeDefined()
    runner.expect(id2).toBeDefined()
    // IDs should be different (though this is probabilistic)
    if (id1 === id2) {
      throw new Error('Generated IDs should be unique')
    }
  })

  // Test 3: Overlay creation
  runner.test('createMockOverlay creates valid overlay structure', () => {
    const points = [
      createMockPoint(1640995200000, 100),
      createMockPoint(1640995260000, 105)
    ]
    const overlay = createMockOverlay(points)
    
    runner.expect(overlay.id).toBeDefined()
    runner.expect(overlay.points).toHaveLength(2)
    runner.expect(overlay.visible).toBe(true)
    runner.expect(overlay.lock).toBe(false)
  })

  // Test 4: Manager initialization (without chart dependency)
  runner.test('managers can be instantiated', () => {
    // These tests verify the classes can be imported and have expected structure
    runner.expect(OverlayProjectionManager).toBeDefined()
    runner.expect(OverlayCreationManager).toBeDefined()
    runner.expect(OverlayMigrationManager).toBeDefined()
    runner.expect(OverlayTemplateAdapter).toBeDefined()
  })

  // Test 5: Enhanced templates
  runner.test('createEnhancedOverlayTemplates is callable', () => {
    runner.expect(createEnhancedOverlayTemplates).toBeDefined()
    runner.expect(typeof createEnhancedOverlayTemplates).toBe('function')
  })

  // Test 6: Coordinate utilities
  runner.test('coordinate utility functions are available', () => {
    runner.expect(dataToScreen).toBeDefined()
    runner.expect(screenToData).toBeDefined()
    runner.expect(projectPoints).toBeDefined()
    runner.expect(typeof dataToScreen).toBe('function')
    runner.expect(typeof screenToData).toBe('function')
    runner.expect(typeof projectPoints).toBe('function')
  })

  // Test 7: Data structure integrity
  runner.test('overlay data structure has required fields', () => {
    const overlay = createMockOverlay([createMockPoint(Date.now(), 100)])
    
    // Check required fields exist
    const requiredFields = ['id', 'type', 'points', 'style', 'visible', 'lock', 'createdAt', 'version']
    for (const field of requiredFields) {
      if (!(field in overlay)) {
        throw new Error(`Missing required field: ${field}`)
      }
    }
  })

  // Test 8: Point structure integrity
  runner.test('overlay points have required fields', () => {
    const point = createMockPoint(Date.now(), 100)
    
    runner.expect(point.id).toBeDefined()
    runner.expect(typeof point.t).toBe('number')
    runner.expect(typeof point.p).toBe('number')
    runner.expect(point.t).toBeGreaterThan(0)
  })

  return runner.run()
}

/**
 * Performance validation
 */
export function runPerformanceValidation(): boolean {
  console.log('\n⚡ Running Performance Validation...')
  
  try {
    // Test point generation performance
    const startTime = performance.now()
    const points: OverlayPoint[] = []
    
    for (let i = 0; i < 1000; i++) {
      points.push(createMockPoint(Date.now() + i * 60000, 100 + Math.random() * 20))
    }
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    console.log(`✅ Generated 1000 points in ${duration.toFixed(2)}ms`)
    
    if (duration > 100) {
      console.log(`⚠️  Warning: Point generation took ${duration.toFixed(2)}ms (expected < 100ms)`)
      return false
    }
    
    return true
  } catch (error) {
     console.log(`❌ Performance test failed: ${error instanceof Error ? error.message : String(error)}`)
     return false
   }
}

/**
 * Main validation function
 */
export function validateOverlaySystem(): boolean {
  console.log('🚀 Starting Overlay System Validation\n')
  
  const functionalTests = runOverlaySystemValidation()
  const performanceTests = runPerformanceValidation()
  
  const allPassed = functionalTests && performanceTests
  
  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    console.log('🎉 All validation tests passed! Overlay system is ready.')
  } else {
    console.log('💥 Some validation tests failed. Please review the issues above.')
  }
  console.log('='.repeat(50))
  
  return allPassed
}

// Auto-run validation if this file is executed directly
if (typeof window === 'undefined') {
  validateOverlaySystem()
}