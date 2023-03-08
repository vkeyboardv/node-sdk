--[[
Deletes M expired keys from the hash.

Complexity: O(log(N) + M) + O(M) + O(M * log(N)) with N being the number of
elements in the hash and M being the number of elements deleted. For constant M
(e.g., 3) the complexity is O(log(N)).

Args:
    KEYS:
        hash_name.
        zset_name.

    ARGV:
        delete_count.

Returns: nil.
--]]

local hash_name = KEYS[1]
local zset_name = KEYS[2]
local delete_count = tonumber(ARGV[1])
local time = redis.call('TIME')
local pnow = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)

local keys_to_delete = redis.call(
        'ZRANGEBYSCORE', zset_name, '-inf', pnow, 'LIMIT', 0, delete_count
)

if not next(keys_to_delete) then
    return
end

redis.call('HDEL', hash_name, unpack(keys_to_delete))
redis.call('ZREM', zset_name, unpack(keys_to_delete))
