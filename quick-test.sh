#!/bin/bash

# Quick Backend Test - Essential functionality only
echo "🚀 Quick Backend Test"
echo "===================="

# Check server
echo "1. Health Check..."
if curl -s http://localhost:3001/api/health | grep -q "ok"; then
    echo "   ✅ Server is running"
else
    echo "   ❌ Server not responding"
    exit 1
fi

# Test newsletter
echo "2. Newsletter..."
response=$(curl -s -X POST http://localhost:3001/api/newsletter -H "Content-Type: application/json" -d '{"email":"quicktest@example.com"}')
if echo "$response" | grep -q "Subscribed successfully"; then
    echo "   ✅ Newsletter working"
else
    echo "   ❌ Newsletter failed"
fi

# Test signup
echo "3. User Signup..."
response=$(curl -s -X POST http://localhost:3001/api/signup -H "Content-Type: application/json" -d '{"name":"Quick Test","email":"quicktest@example.com","client_type":"individual","service":"tax","password":"QuickTest123!"}')
if echo "$response" | grep -q "ok.*true"; then
    echo "   ✅ Signup working"
else
    echo "   ❌ Signup failed"
fi

# Test login
echo "4. User Login..."
response=$(curl -s -X POST http://localhost:3001/api/login -H "Content-Type: application/json" -d '{"email":"quicktest@example.com","password":"QuickTest123!"}')
if echo "$response" | grep -q "ok.*true"; then
    echo "   ✅ Login working"
else
    echo "   ❌ Login failed"
fi

# Test contact
echo "5. Contact Form..."
response=$(curl -s -X POST http://localhost:3001/api/contact -H "Content-Type: application/json" -d '{"name":"Quick Test","email":"quicktest@example.com","subject":"Test","message":"Quick test message"}')
if echo "$response" | grep -q "Message received"; then
    echo "   ✅ Contact form working"
else
    echo "   ❌ Contact form failed"
fi

echo ""
echo "🎉 Quick test complete!"
