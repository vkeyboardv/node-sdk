--[[
Inserts a field with an expiration time into the hash specified by the key.

Complexity: O(log(N)) with N being the number of elements in the hash.

1. If hash does not exist, it will automatically create one.
2. If the field already exists, its value and ttl will be overwritten.
3. Hash ttl is always set to the biggest field's ttl.
4. When the field expires it may be deleted by:
   - Manually invoking `vacuum` script.
   - Redis automatically deleting expired hash (see note #3).

Args:
    KEYS:
        hash_name.
        zset_name.

    ARGV:
        key.
        value.
        ttl.

Returns: nil.
--]]

local hash_name = KEYS[1]
local zset_name = KEYS[2]
local key = ARGV[1]
local value = ARGV[2]
local ttl = tonumber(ARGV[3])
local time = redis.call('TIME')
local pexpireat = ((tonumber(time[1]) + ttl) * 1000 + math.floor(tonumber(time[2]) / 1000))

redis.call('HSET', hash_name, key, value)
redis.call('ZADD', zset_name, pexpireat, key)

local max_pexpireat = tonumber(redis.call(
        'ZREVRANGEBYSCORE', zset_name, '+inf', '-inf', 'WITHSCORES', 'LIMIT', 0, 1
)[2])

redis.call('PEXPIREAT', hash_name, max_pexpireat)
redis.call('PEXPIREAT', zset_name, max_pexpireat)
